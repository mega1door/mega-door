-- PROPOSAL ONLY: not an automatic migration. No production execution is authorized.
-- Apply only after reviewing 00_inspect_admin_access.sql and approving this change.
begin;

do $$
begin
  if not exists (select 1 from auth.users where id='4ece01b2-d222-4291-b404-60bff142177f'
      and lower(email)='hebu.ozen@gmail.com' and email_confirmed_at is not null and deleted_at is null) then
    raise exception 'Existing confirmed owner identity must be verified before applying';
  end if;
  if exists (select 1 from pg_policies where permissive='RESTRICTIVE' and cmd in ('ALL','INSERT','UPDATE','DELETE')
      and policyname not in ('mega_insert_gate','mega_update_gate','mega_delete_gate',
        'mega_storage_insert_gate','mega_storage_update_gate','mega_storage_delete_gate')
      and ((schemaname='public' and tablename in ('models','categories','spec_templates','site_settings'))
      or (schemaname='storage' and tablename='objects'))) then
    raise exception 'Review existing restrictive policies first; do not replace them blindly';
  end if;
  if not exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='storage' and c.relname='objects' and c.relrowsecurity) then
    raise exception 'Storage objects must already have RLS enabled';
  end if;
  if not has_table_privilege('authenticated','storage.objects','SELECT')
    or not has_table_privilege('authenticated','storage.objects','INSERT')
    or not has_table_privilege('authenticated','storage.objects','UPDATE')
    or not has_table_privilege('authenticated','storage.objects','DELETE') then
    raise exception 'Review Storage authenticated CRUD grants before applying';
  end if;
end $$;

create schema if not exists mega_private;
revoke all on schema mega_private from public, anon, authenticated;
create table if not exists mega_private.admin_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin')),
  approved_by uuid references auth.users(id),
  approved_at timestamptz not null default now()
);
alter table mega_private.admin_memberships enable row level security;
revoke all on mega_private.admin_memberships from public, anon, authenticated;

insert into mega_private.admin_memberships(user_id,role)
values ('4ece01b2-d222-4291-b404-60bff142177f','owner')
on conflict (user_id) do nothing;
do $$ begin
  if not exists (select 1 from mega_private.admin_memberships
    where user_id='4ece01b2-d222-4291-b404-60bff142177f' and role='owner') then
    raise exception 'Existing owner membership conflicts; review manually';
  end if;
end $$;

-- No caller-supplied user ID or user_metadata is trusted for authorization.
create or replace function public.mega_admin_role() returns text
language sql stable security definer set search_path = '' as $$
  select m.role from mega_private.admin_memberships m
  join auth.users u on u.id=m.user_id
  where m.user_id=(select auth.uid()) and u.email_confirmed_at is not null and u.deleted_at is null
$$;
revoke all on function public.mega_admin_role() from public;
grant execute on function public.mega_admin_role() to anon, authenticated;

create or replace function public.mega_admin_accounts()
returns table(user_id uuid, email text, confirmed boolean, role text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if public.mega_admin_role() is distinct from 'owner' then
    raise exception 'Owner approval required' using errcode='42501';
  end if;
  return query select u.id, u.email::text, u.email_confirmed_at is not null,
    coalesce(m.role,'pending') from auth.users u
    left join mega_private.admin_memberships m on m.user_id=u.id where u.deleted_at is null
    order by u.created_at desc;
end $$;

create or replace function public.mega_approve_admin(target_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if public.mega_admin_role() is distinct from 'owner' then
    raise exception 'Owner approval required' using errcode='42501';
  end if;
  if exists (select 1 from mega_private.admin_memberships where user_id=target_user_id and role='owner') then
    raise exception 'The existing owner cannot be changed' using errcode='42501';
  end if;
  if not exists (select 1 from auth.users where id=target_user_id and email_confirmed_at is not null and deleted_at is null) then
    raise exception 'Account must confirm its email first' using errcode='22023';
  end if;
  insert into mega_private.admin_memberships(user_id,role,approved_by)
    values(target_user_id,'admin',auth.uid()) on conflict (user_id) do nothing;
end $$;

create or replace function public.mega_revoke_admin(target_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if public.mega_admin_role() is distinct from 'owner' then
    raise exception 'Owner approval required' using errcode='42501';
  end if;
  if exists (select 1 from mega_private.admin_memberships where user_id=target_user_id and role='owner') then
    raise exception 'The existing owner cannot be changed' using errcode='42501';
  end if;
  delete from mega_private.admin_memberships where user_id=target_user_id and role='admin';
end $$;

revoke all on function public.mega_admin_accounts() from public, anon;
revoke all on function public.mega_approve_admin(uuid) from public, anon;
revoke all on function public.mega_revoke_admin(uuid) from public, anon;
grant execute on function public.mega_admin_accounts(), public.mega_approve_admin(uuid), public.mega_revoke_admin(uuid) to authenticated;

do $$
declare target text;
begin
  foreach target in array array['models','categories','spec_templates','site_settings'] loop
    execute format('alter table public.%I enable row level security',target);
    -- TRUNCATE bypasses RLS. Clients retain only the required table operations.
    execute format('revoke all on public.%I from anon, authenticated',target);
    execute format('grant select on public.%I to anon, authenticated',target);
    execute format('grant insert, update, delete on public.%I to authenticated',target);
    execute format('drop policy if exists mega_public_read on public.%I',target);
    execute format('create policy mega_public_read on public.%I for select to anon, authenticated using (true)',target);
    execute format('drop policy if exists mega_admin_write on public.%I',target);
    execute format('create policy mega_admin_write on public.%I for all to authenticated using ((select public.mega_admin_role()) in (''owner'',''admin'')) with check ((select public.mega_admin_role()) in (''owner'',''admin''))',target);
    -- Restrictive gates also block old permissive policies from granting writes.
    execute format('drop policy if exists mega_insert_gate on public.%I',target);
    execute format('create policy mega_insert_gate on public.%I as restrictive for insert to anon, authenticated with check ((select public.mega_admin_role()) in (''owner'',''admin''))',target);
    execute format('drop policy if exists mega_update_gate on public.%I',target);
    execute format('create policy mega_update_gate on public.%I as restrictive for update to anon, authenticated using ((select public.mega_admin_role()) in (''owner'',''admin'')) with check ((select public.mega_admin_role()) in (''owner'',''admin''))',target);
    execute format('drop policy if exists mega_delete_gate on public.%I',target);
    execute format('create policy mega_delete_gate on public.%I as restrictive for delete to anon, authenticated using ((select public.mega_admin_role()) in (''owner'',''admin''))',target);
  end loop;
end $$;

-- Protect only this site's bucket. Existing policies for other buckets remain intact.
-- Non-row privileges cannot be constrained by bucket RLS.
revoke truncate, references, trigger on storage.objects from anon, authenticated;
drop policy if exists mega_storage_admin on storage.objects;
create policy mega_storage_admin on storage.objects for all to authenticated
using (bucket_id='site-images' and (select public.mega_admin_role()) in ('owner','admin'))
with check (bucket_id='site-images' and (select public.mega_admin_role()) in ('owner','admin'));
drop policy if exists mega_storage_insert_gate on storage.objects;
create policy mega_storage_insert_gate on storage.objects as restrictive for insert to anon, authenticated
with check (bucket_id<>'site-images' or (select public.mega_admin_role()) in ('owner','admin'));
drop policy if exists mega_storage_update_gate on storage.objects;
create policy mega_storage_update_gate on storage.objects as restrictive for update to anon, authenticated
using (bucket_id<>'site-images' or (select public.mega_admin_role()) in ('owner','admin'))
with check (bucket_id<>'site-images' or (select public.mega_admin_role()) in ('owner','admin'));
drop policy if exists mega_storage_delete_gate on storage.objects;
create policy mega_storage_delete_gate on storage.objects as restrictive for delete to anon, authenticated
using (bucket_id<>'site-images' or (select public.mega_admin_role()) in ('owner','admin'));

commit;
