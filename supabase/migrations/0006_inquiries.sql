-- =====================================================================
-- 0006 — inquiries
-- =====================================================================
-- Messages sent by anonymous visitors from a listing page.
--
-- SECURITY: this table has NO anon policy in 0007. Anonymous inserts go
-- through a Server Action running on the service-role client, after zod
-- validation, a honeypot check and a rate-limit check. Granting anon
-- INSERT would expose a spam endpoint to anyone holding the anon key —
-- and the anon key ships to every browser.
--
-- PRIVACY: only a salted hash of the sender's IP is stored, never the
-- address itself. The hash exists solely to power the rate limit.
-- =====================================================================

create table if not exists public.inquiries (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references public.listings(id) on delete cascade,

  -- Denormalized so the seller inbox needs no join and survives as an
  -- ownership anchor for RLS.
  seller_id    uuid not null references public.profiles(id) on delete cascade,

  sender_name  text not null,
  sender_phone text,
  sender_email text,
  message      text not null,

  ip_hash      text,
  is_read      boolean not null default false,
  created_at   timestamptz not null default now(),

  constraint inquiries_name_len    check (char_length(sender_name) between 2 and 80),
  constraint inquiries_message_len check (char_length(message) between 10 and 2000),
  constraint inquiries_email_format check (
    sender_email is null or sender_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  constraint inquiries_has_contact check (
    sender_phone is not null or sender_email is not null
  )
);

comment on column public.inquiries.ip_hash is
  'SHA-256 of sender IP + INQUIRY_IP_SALT. Raw IP is never stored.';

create index if not exists inquiries_seller_idx
  on public.inquiries (seller_id, created_at desc);

create index if not exists inquiries_unread_idx
  on public.inquiries (seller_id)
  where not is_read;

create index if not exists inquiries_listing_idx
  on public.inquiries (listing_id, created_at desc);

-- Supports the rate-limit lookup: count by ip_hash within a time window.
create index if not exists inquiries_ratelimit_idx
  on public.inquiries (ip_hash, created_at desc)
  where ip_hash is not null;
