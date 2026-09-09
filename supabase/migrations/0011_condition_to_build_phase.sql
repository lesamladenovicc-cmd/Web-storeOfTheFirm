-- =====================================================================
-- 0011 — listing_condition: from "used goods" to "build phase"
-- =====================================================================
-- The store was built for second-hand machines, so the condition enum
-- described wear ('novo' … 'neispravno'). BG Building sells NEW-BUILD
-- property, where the axis that actually varies is how far the building
-- has progressed. The column keeps its name and its position in every
-- query, index and RLS policy — only the four labels change meaning.
--
-- ALTER TYPE ... RENAME VALUE is in-place: it rewrites the pg_enum row,
-- not the table, so existing listings keep pointing at the same value
-- and no data migration is needed.
--
-- NOTE: renaming does NOT reorder the enum. Postgres still sorts by the
-- original creation order (useljivo < pred_useljenje < u_izgradnji <
-- u_pripremi), which is no longer chronological. Nothing may `order by
-- condition` — display order comes from LISTING_CONDITIONS in
-- src/config/taxonomy.ts.
-- =====================================================================

do $$ begin
  alter type public.listing_condition rename value 'novo'       to 'useljivo';
  alter type public.listing_condition rename value 'kao_novo'   to 'pred_useljenje';
  alter type public.listing_condition rename value 'korisceno'  to 'u_izgradnji';
  alter type public.listing_condition rename value 'neispravno' to 'u_pripremi';
exception when invalid_parameter_value then null;  -- already renamed
end $$;

comment on type public.listing_condition is
  'Build phase of the unit, not wear. Chronological order lives in src/config/taxonomy.ts, NOT in the enum.';

comment on column public.listings.condition is
  'Build phase: u_pripremi -> u_izgradnji -> pred_useljenje -> useljivo.';
