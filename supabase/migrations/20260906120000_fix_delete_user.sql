-- Auth → Users → Delete fails with "Database error deleting user" when
-- public rows still point at auth.users, or supabase_auth_admin cannot
-- delete the matching profile.

grant select, insert, update, delete on table public.profiles to supabase_auth_admin, service_role;
grant select on table public.businesses to supabase_auth_admin, service_role;

drop policy if exists "profiles_delete_auth_admin" on public.profiles;
create policy "profiles_delete_auth_admin" on public.profiles
  for delete
  to supabase_auth_admin, service_role
  using (true);

create or replace function public.handle_auth_user_deleted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.businesses where owner_id = old.id) then
    raise exception 'Cannot delete the company owner while a business still points at this account.';
  end if;

  delete from public.profiles where id = old.id;
  return old;
end;
$$;

alter function public.handle_auth_user_deleted() owner to postgres;

grant execute on function public.handle_auth_user_deleted() to supabase_auth_admin, postgres, service_role;

drop trigger if exists on_auth_user_deleted on auth.users;
create trigger on_auth_user_deleted
  before delete on auth.users
  for each row
  execute function public.handle_auth_user_deleted();
