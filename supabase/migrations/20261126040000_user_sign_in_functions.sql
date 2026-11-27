-- Midwest passwords stay on the server (J, Nov 26 2026, before every Midwest person joins the DYFRENT Network).
-- Step 1 of 2: the sign-in and user-admin functions. They change nothing on their own; the app moves onto them,
-- then 20261126040100_lock_user_passwords.sql takes the password column away from the public key.
--
--   mw_login(username, password)         sign in: the user without the password, plus a new 30 day session token
--   mw_check_login(username, password)   the Network sign-in on Midwest's server: id, name and role only
--   mw_user_save(session, user)          Users & Permissions, admin sessions only: add or change a user
--   mw_user_delete(session, id)          Users & Permissions, admin sessions only: remove a user
--
-- Only a sha256 of each session token is stored. Passwords are compared on the server and never returned.

create table if not exists public.user_sessions (
  token_hash text primary key,
  user_id    text not null references public.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.user_sessions enable row level security;
revoke all on public.user_sessions from anon, authenticated;

create or replace function public.mw_user_out(u public.users) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object('id', u.id, 'username', u.username, 'role', u.role, 'rep_id', u.rep_id, 'name', u.name,
    'created_at', u.created_at, 'pages', u.pages)
$$;

create or replace function public.mw_login(p_username text, p_password text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u public.users; tok text;
begin
  if p_username is null or p_password is null or length(p_password) = 0 or length(p_password) > 200 or length(p_username) > 80 then return null; end if;
  select * into u from public.users where username = p_username and password = p_password limit 1;
  if not found then return null; end if;
  delete from public.user_sessions where expires_at < now();
  tok := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.user_sessions (token_hash, user_id, expires_at)
    values (encode(extensions.digest(tok, 'sha256'), 'hex'), u.id, now() + interval '30 days');
  return public.mw_user_out(u) || jsonb_build_object('session', tok);
end $$;

create or replace function public.mw_check_login(p_username text, p_password text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u public.users;
begin
  if p_username is null or p_password is null or length(p_password) = 0 or length(p_password) > 200 or length(p_username) > 80 then return null; end if;
  select * into u from public.users where username = p_username and password = p_password limit 1;
  if not found then return null; end if;
  return jsonb_build_object('id', u.id, 'name', u.name, 'role', u.role);
end $$;

-- The admin behind a session, or null.
create or replace function public.mw_session_admin(p_session text) returns text
language sql stable security definer set search_path = '' as $$
  select u.id from public.user_sessions s join public.users u on u.id = s.user_id
   where p_session ~ '^[0-9a-f]{64}$' and s.token_hash = encode(extensions.digest(p_session, 'sha256'), 'hex')
     and s.expires_at > now() and u.role = 'admin'
$$;

create or replace function public.mw_user_save(p_session text, p_user jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pid text; pw text; existing public.users; saved public.users;
begin
  if public.mw_session_admin(p_session) is null then return jsonb_build_object('ok', false, 'code', 'signin'); end if;
  if jsonb_typeof(p_user) is distinct from 'object' then return jsonb_build_object('ok', false); end if;
  pid := btrim(coalesce(p_user->>'id', ''));
  pw := coalesce(p_user->>'password', '');
  if pid !~ '^[A-Za-z0-9_.:@-]{1,128}$' then return jsonb_build_object('ok', false); end if;
  if pw <> '' and (length(pw) < 4 or length(pw) > 200) then return jsonb_build_object('ok', false); end if;
  select * into existing from public.users where id = pid;
  if not found then
    if pw = '' or coalesce(btrim(p_user->>'username'), '') = '' or coalesce(btrim(p_user->>'name'), '') = '' then return jsonb_build_object('ok', false); end if;
    insert into public.users (id, username, password, role, rep_id, name, pages)
      values (pid, btrim(p_user->>'username'), pw, coalesce(nullif(p_user->>'role', ''), 'sales'), p_user->>'rep_id', btrim(p_user->>'name'), p_user->>'pages')
      returning * into saved;
  else
    update public.users set
      username = case when p_user ? 'username' and coalesce(btrim(p_user->>'username'), '') <> '' then btrim(p_user->>'username') else username end,
      name     = case when p_user ? 'name' and coalesce(btrim(p_user->>'name'), '') <> '' then btrim(p_user->>'name') else name end,
      role     = case when p_user ? 'role' and coalesce(p_user->>'role', '') <> '' then p_user->>'role' else role end,
      rep_id   = case when p_user ? 'rep_id' then p_user->>'rep_id' else rep_id end,
      pages    = case when p_user ? 'pages' then p_user->>'pages' else pages end,
      password = case when pw <> '' then pw else password end
    where id = pid returning * into saved;
    -- A changed password signs that person out everywhere else.
    if pw <> '' then delete from public.user_sessions where user_id = pid and token_hash <> encode(extensions.digest(p_session, 'sha256'), 'hex'); end if;
  end if;
  return jsonb_build_object('ok', true, 'user', public.mw_user_out(saved));
exception when unique_violation then return jsonb_build_object('ok', false, 'code', 'taken');
end $$;

create or replace function public.mw_user_delete(p_session text, p_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if public.mw_session_admin(p_session) is null then return jsonb_build_object('ok', false, 'code', 'signin'); end if;
  if p_id is null or p_id = 'USR-000' then return jsonb_build_object('ok', false); end if;
  delete from public.users where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.mw_user_out(public.users) from public, anon, authenticated;
revoke all on function public.mw_session_admin(text) from public, anon, authenticated;
revoke all on function public.mw_login(text, text) from public;
revoke all on function public.mw_check_login(text, text) from public;
revoke all on function public.mw_user_save(text, jsonb) from public;
revoke all on function public.mw_user_delete(text, text) from public;
grant execute on function public.mw_login(text, text) to anon, authenticated;
grant execute on function public.mw_check_login(text, text) to anon, authenticated;
grant execute on function public.mw_user_save(text, jsonb) to anon, authenticated;
grant execute on function public.mw_user_delete(text, text) to anon, authenticated;
