-- =====================================================================
-- LOCAL VERIFICATION STUBS — never run against a real Supabase project
-- =====================================================================
-- Supabase provides the `auth` and `storage` schemas, the anon /
-- authenticated / service_role roles, and auth.uid(). PGlite does not,
-- so this file recreates just enough of them to execute the migrations
-- and exercise the RLS policies locally.
--
-- auth.uid() here reads a session GUC instead of a JWT claim, which is
-- behaviourally equivalent for policy evaluation.
-- =====================================================================

create schema if not exists auth;
create schema if not exists storage;
create schema if not exists extensions;

-- ---------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------

do $$ begin
  create role anon nologin noinherit;
exception when duplicate_object then null;
end $$;

do $$ begin
  create role authenticated nologin noinherit;
exception when duplicate_object then null;
end $$;

do $$ begin
  create role service_role nologin noinherit bypassrls;
exception when duplicate_object then null;
end $$;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth, storage, extensions to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- auth.users (minimal shape)
-- ---------------------------------------------------------------------

create table if not exists auth.users (
  id                  uuid primary key default gen_random_uuid(),
  email               text unique,
  raw_user_meta_data  jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- auth.uid() — session GUC stand-in for the JWT `sub` claim
-- ---------------------------------------------------------------------

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('test.user_id', true), '')::uuid;
$$;

grant execute on function auth.uid() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- storage stubs
-- ---------------------------------------------------------------------

create table if not exists storage.buckets (
  id                 text primary key,
  name               text not null,
  public             boolean not null default false,
  file_size_limit    bigint,
  allowed_mime_types text[]
);

create table if not exists storage.objects (
  id         uuid primary key default gen_random_uuid(),
  bucket_id  text references storage.buckets(id),
  name       text not null,
  owner      uuid,
  created_at timestamptz not null default now()
);

alter table storage.objects enable row level security;
grant select on storage.objects to anon, authenticated;
grant insert, update, delete on storage.objects to authenticated;

-- Splits an object key into its folder segments, 1-indexed.
create or replace function storage.foldername(name text)
returns text[]
language sql
immutable
as $$
  select string_to_array(regexp_replace(name, '/[^/]*$', ''), '/');
$$;

grant execute on function storage.foldername(text) to anon, authenticated;
