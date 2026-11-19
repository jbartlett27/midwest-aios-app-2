-- Serialize document-status edits on the shared row and only apply the keys
-- that still match the version the caller edited.
create function public.save_document_status_changes(changes jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  status_row public.sops%rowtype;
  statuses jsonb;
  next_statuses jsonb;
  change record;
begin
  if jsonb_typeof(changes) is distinct from 'object' then
    raise exception 'Expected an object of document status changes';
  end if;

  select * into strict status_row from public.sops
    where id = 'DOC_STATUSES_GLOBAL' and cat = 'DocStatuses'
    for update;
  statuses := status_row.content::jsonb;
  if jsonb_typeof(statuses) is distinct from 'object' then
    raise exception 'Stored document statuses are invalid';
  end if;
  next_statuses := statuses;

  for change in select key, value from jsonb_each(changes) loop
    if jsonb_typeof(change.value->'before') is distinct from 'array'
       or jsonb_typeof(change.value->'after') is distinct from 'array'
       or jsonb_array_length(change.value->'before') > 1
       or jsonb_array_length(change.value->'after') > 1 then
      raise exception 'Invalid document status change';
    end if;
    if statuses->change.key is distinct from change.value->'before'->0
       and statuses->change.key is distinct from change.value->'after'->0 then
      return jsonb_build_object('ok', false, 'conflict', true, 'row', to_jsonb(status_row));
    end if;
    if jsonb_array_length(change.value->'after') = 0 then
      next_statuses := next_statuses - change.key;
    else
      next_statuses := jsonb_set(next_statuses, array[change.key], change.value->'after'->0);
    end if;
  end loop;

  if next_statuses is distinct from statuses then
    update public.sops set content = next_statuses::text
      where id = status_row.id returning * into status_row;
  end if;
  return jsonb_build_object('ok', true, 'row', to_jsonb(status_row));
end;
$$;

revoke all on function public.save_document_status_changes(jsonb) from public;
grant execute on function public.save_document_status_changes(jsonb) to anon, authenticated;

-- Cached pre-release tabs used a delete followed by a full snapshot upsert.
-- Keep those clients from deleting or replacing the shared registry.
create function public.guard_document_status_registry()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated', 'service_role')
     and ((tg_op <> 'INSERT' and old.id = 'DOC_STATUSES_GLOBAL')
       or (tg_op <> 'DELETE' and new.id = 'DOC_STATUSES_GLOBAL')) then
    raise exception 'Refresh the app before changing document statuses';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger guard_document_status_registry
before insert or update or delete on public.sops
for each row execute function public.guard_document_status_registry();
