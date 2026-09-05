-- Auth user creation failed because the profile trigger could not run:
-- supabase_auth_admin had no grants, and invalid metadata (empty role) crashed the insert.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role := 'owner';
  v_business_id uuid;
  v_status public.user_status := 'active';
begin
  begin
    v_business_id := nullif(trim(new.raw_user_meta_data->>'business_id'), '')::uuid;
  exception when others then
    v_business_id := null;
  end;

  begin
    v_role := coalesce(
      nullif(trim(new.raw_user_meta_data->>'role'), '')::public.user_role,
      'owner'
    );
  exception when others then
    v_role := 'owner';
  end;

  if v_business_id is not null then
    v_status := 'invited';
  end if;

  insert into public.profiles (id, business_id, full_name, email, role, status)
  values (
    new.id,
    v_business_id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      ''
    ),
    coalesce(new.email, new.raw_user_meta_data->>'email', ''),
    v_role,
    v_status
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name);

  return new;
end;
$$;

alter function public.handle_new_user() owner to postgres;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.handle_new_user() to supabase_auth_admin, postgres, service_role;
grant select, insert, update on table public.profiles to supabase_auth_admin, service_role;
grant usage on type public.user_role to supabase_auth_admin, service_role;
grant usage on type public.user_status to supabase_auth_admin, service_role;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
