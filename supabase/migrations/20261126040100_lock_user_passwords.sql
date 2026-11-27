-- Midwest passwords stay on the server, step 2 of 2. Apply ONLY after the app that signs in through mw_login is live
-- (step 1: 20261126040000_user_sign_in_functions.sql). Before this, anyone holding the app's public key could read
-- every password (users?select=*) or overwrite one. After it, the public key reads users without the password column
-- and cannot write users at all; adding, changing and removing users goes through mw_user_save / mw_user_delete.
--
-- Rollback (puts back what was there before):
--   grant all on public.users to anon, authenticated;

revoke all on public.users from anon, authenticated;
grant select (id, username, role, rep_id, name, created_at, pages) on public.users to anon, authenticated;
