-- =====================================================================
-- 0002 — profiles
-- =====================================================================
-- Internal staff only. There is no public sign-up: accounts are created
-- by an admin through the service-role API. `profiles` mirrors
-- auth.users and holds the application-level role and status.
--
-- NOTE: profiles is NEVER readable by anon. Public listing pages get
-- their contact details from denormalized columns on `listings`, so the
-- public path never touches staff records at all.
-- =====================================================================

create table if not exists public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  email                 text not null,
  full_name             text not null default '',
  phone                 text,
  location              text,
  role                  public.user_role not null default 'seller',
  is_active             boolean not null default true,
  must_change_password  boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint profiles_full_name_len check (char_length(full_name) <= 120),
  constraint profiles_location_len  check (location is null or char_length(location) <= 80)
);

comment on table public.profiles is
  'Internal staff. Created by admin via service role; no public signup.';
comment on column public.profiles.must_change_password is
  'Set when an admin issues a temporary password; forces /dashboard/promena-lozinke.';

create index if not exists profiles_role_idx on public.profiles (role) where is_active;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Authorization helpers
-- ---------------------------------------------------------------------
-- Defined here rather than in 0001 because they query this table and
-- Postgres validates `language sql` bodies at creation time.
--
-- SECURITY DEFINER is load-bearing: these are called from RLS policies
-- ON profiles itself, and a plain query would recurse into the policy
-- currently being evaluated. search_path is pinned to defeat hijacking.
--
-- auth.uid() is wrapped in a scalar subquery so Postgres caches it as an
-- InitPlan instead of re-evaluating it once per row.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
      and is_active
  );
$$;

create or replace function public.is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and is_active
  );
$$;

revoke execute on function public.is_admin() from public;
revoke execute on function public.is_active_staff() from public;
grant execute on function public.is_admin() to authenticated, anon;
grant execute on function public.is_active_staff() to authenticated;

-- ---------------------------------------------------------------------
-- Mirror new auth.users rows into profiles
-- ---------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Privilege-escalation guard
-- ---------------------------------------------------------------------
-- RLS lets a user UPDATE their own profile row (name, phone, location).
-- Without this trigger that same policy would let them set role='admin'
-- or re-activate a disabled account. Triggers are NOT bypassed by RLS,
-- so this is the correct place to enforce it.
--
-- auth.uid() IS NULL means there is no end-user JWT: a service-role call
-- or a direct SQL session. Both are trusted by definition.

create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (select auth.uid()) is null or public.is_admin() then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'Izmena uloge naloga nije dozvoljena.'
      using errcode = '42501';
  end if;

  if new.is_active is distinct from old.is_active then
    raise exception 'Izmena statusa naloga nije dozvoljena.'
      using errcode = '42501';
  end if;

  if new.id is distinct from old.id then
    raise exception 'Izmena identifikatora naloga nije dozvoljena.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard_privileges on public.profiles;
create trigger profiles_guard_privileges
  before update on public.profiles
  for each row execute function public.guard_profile_privileges();
