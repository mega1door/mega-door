-- PROPOSAL ONLY. Apply after reviewed 01_admin_access.sql, before the Edge Function.
begin;
create or replace function public.mega_admin_role() returns text
language sql stable security definer set search_path='' as $$
  select m.role from mega_private.admin_memberships m join auth.users u on u.id=m.user_id
  where m.user_id=(select auth.uid()) and u.email_confirmed_at is not null and u.deleted_at is null
$$;
create or replace function mega_private.remove_deleted_membership() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.deleted_at is not null then
    delete from mega_private.admin_memberships where user_id=new.id and role<>'owner';
  end if;
  return new;
end $$;
revoke all on function mega_private.remove_deleted_membership() from public,anon,authenticated;
drop trigger if exists mega_deleted_membership on auth.users;
create trigger mega_deleted_membership after update of deleted_at on auth.users
for each row execute function mega_private.remove_deleted_membership();
create or replace function public.mega_self_delete_ready() returns boolean
language sql stable security definer set search_path='' as $$
  select pg_catalog.pg_get_functiondef('public.mega_admin_role()'::regprocedure) like '%deleted_at is null%'
    and exists(select 1 from pg_catalog.pg_trigger where tgname='mega_deleted_membership' and not tgisinternal)
$$;
revoke all on function public.mega_self_delete_ready() from public,anon;
grant execute on function public.mega_self_delete_ready() to authenticated;
commit;
