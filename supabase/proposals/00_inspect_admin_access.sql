-- READ ONLY. Review these results before approving 01_admin_access.sql.
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where (schemaname = 'public' and tablename in ('models','categories','spec_templates','site_settings'))
   or (schemaname = 'storage' and tablename = 'objects')
order by schemaname, tablename, policyname;

select table_schema, table_name, grantee, privilege_type
from information_schema.role_table_grants
where grantee in ('anon','authenticated') and
 ((table_schema = 'public' and table_name in ('models','categories','spec_templates','site_settings'))
 or (table_schema = 'storage' and table_name = 'objects'));

select n.nspname, c.relname, pg_get_userbyid(c.relowner) as table_owner,
 c.relrowsecurity, c.relforcerowsecurity, c.reloptions
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where (n.nspname='public' and c.relkind in ('v','m'))
 or (n.nspname='public' and c.relname in ('models','categories','spec_templates','site_settings'))
 or (n.nspname='storage' and c.relname='objects');

-- Review any existing SECURITY DEFINER entry points for alternate write paths.
select n.nspname, p.proname, pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.prosecdef;

-- Confirms the existing owner's identity without modifying Auth or passwords.
select id, email, email_confirmed_at
from auth.users where id='4ece01b2-d222-4291-b404-60bff142177f';
select id, public from storage.buckets where id='site-images';
