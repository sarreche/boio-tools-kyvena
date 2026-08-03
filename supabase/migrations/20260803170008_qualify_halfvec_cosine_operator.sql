
-- The connected project received the first phase-3 migration before the cosine
-- operator was schema-qualified. Keep the extension schema explicit for that
-- deployed function; the base migration is also corrected for clean rebuilds.
alter function public.hybrid_search_chunks(uuid, uuid[], text, extensions.halfvec, integer, integer, integer)
  set search_path = pg_catalog, extensions;
