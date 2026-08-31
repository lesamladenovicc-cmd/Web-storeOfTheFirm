-- =====================================================================
-- 0001 — Extensions, enums and shared trigger helpers
-- =====================================================================
-- Extensions are installed into the `extensions` schema, which is the
-- Supabase convention and is already on the default search_path. Every
-- reference below is schema-qualified so the migration does not depend
-- on search_path resolution.
-- =====================================================================

create schema if not exists extensions;

-- Diacritic-insensitive search: Serbs routinely type "masina" for
-- "mašina", and Postgres ships no Serbian FTS dictionary.
create extension if not exists unaccent with schema extensions;

-- Trigram matching for short / misspelled query terms.
create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
-- Values are ASCII slugs, NOT Serbian display text. Serbian labels live
-- in src/config/taxonomy.ts. Diacritics in database identifiers are a
-- portability trap, and this keeps re-labelling a one-file change.

do $$ begin
  create type public.user_role as enum ('admin', 'seller');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.listing_condition as enum
    ('novo', 'kao_novo', 'korisceno', 'neispravno');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.listing_status as enum ('nacrt', 'aktivan', 'prodato');
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------
-- Shared trigger: maintain updated_at
-- ---------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- NOTE: the authorization helpers is_admin() / is_active_staff() live in
-- 0002, not here. They query public.profiles, and Postgres validates
-- `language sql` function bodies at creation time, so they cannot be
-- defined before the table exists.

-- ---------------------------------------------------------------------
-- Immutable unaccent wrapper
-- ---------------------------------------------------------------------
-- extensions.unaccent() is STABLE, not IMMUTABLE, because it depends on
-- a dictionary that could in principle be redefined. Postgres therefore
-- refuses it inside a generated column or a functional index. Pinning
-- the dictionary via ::regdictionary makes the call deterministic, which
-- is the standard and supported workaround.

create or replace function public.f_unaccent(text)
returns text
language sql
immutable
parallel safe
strict
set search_path = extensions, public, pg_temp
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, $1);
$$;

grant execute on function public.f_unaccent(text) to authenticated, anon;
