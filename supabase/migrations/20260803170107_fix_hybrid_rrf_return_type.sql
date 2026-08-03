

-- Hybrid retrieval for phase 3. All tenant and source filters are applied before
-- either candidate ranking and the authenticated caller is the owner boundary.
create or replace function public.hybrid_search_chunks(
  p_notebook_id uuid,
  p_source_ids uuid[],
  p_query_text text,
  p_query_embedding extensions.halfvec(2048),
  p_semantic_limit integer default 20,
  p_lexical_limit integer default 20,
  p_rrf_k integer default 60
)
returns table (
  chunk_id bigint,
  source_id uuid,
  source_title text,
  ordinal smallint,
  content text,
  location jsonb,
  token_count integer,
  semantic_rank integer,
  lexical_rank integer,
  semantic_score double precision,
  lexical_score real,
  rrf_score double precision
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner uuid := (select auth.uid());
begin
  if owner is null then raise exception 'authentication_required'; end if;
  if p_notebook_id is null or cardinality(p_source_ids) not between 1 and 20 then
    raise exception 'invalid_retrieval_scope';
  end if;
  if char_length(btrim(p_query_text)) not between 1 and 4000 then
    raise exception 'invalid_query';
  end if;
  if p_semantic_limit not between 1 and 20 or p_lexical_limit not between 1 and 20 or p_rrf_k not between 1 and 1000 then
    raise exception 'invalid_retrieval_limits';
  end if;

  return query
  with eligible as materialized (
    select c.id, c.source_id, s.title, c.ordinal, c.content, c.location,
      c.token_count, c.embedding, c.search_vector
    from public.chunks c
    join public.sources s
      on s.id = c.source_id and s.owner_id = c.owner_id and s.notebook_id = c.notebook_id
    where c.owner_id = owner
      and c.notebook_id = p_notebook_id
      and c.source_id = any(p_source_ids)
      and s.status = 'ready'
  ),
  semantic as (
    select e.id,
      row_number() over (order by e.embedding OPERATOR(extensions.<=>) p_query_embedding, e.id)::integer as rank,
      (1 - (e.embedding OPERATOR(extensions.<=>) p_query_embedding))::double precision as score
    from eligible e
    order by e.embedding OPERATOR(extensions.<=>) p_query_embedding, e.id
    limit p_semantic_limit
  ),
  lexical_query as (
    select websearch_to_tsquery('simple', p_query_text) as value
  ),
  lexical as (
    select e.id,
      row_number() over (order by ts_rank_cd(e.search_vector, q.value) desc, e.id)::integer as rank,
      ts_rank_cd(e.search_vector, q.value)::real as score
    from eligible e cross join lexical_query q
    where q.value <> ''::tsquery and e.search_vector @@ q.value
    order by score desc, e.id
    limit p_lexical_limit
  ),
  fused as (
    select candidate.id,
      max(semantic.rank) as semantic_rank,
      max(lexical.rank) as lexical_rank,
      max(semantic.score) as semantic_score,
      max(lexical.score) as lexical_score,
      coalesce(max(1.0 / (p_rrf_k + semantic.rank)), 0) +
        coalesce(max(1.0 / (p_rrf_k + lexical.rank)), 0)::double precision as rrf_score
    from (select id from semantic union select id from lexical) candidate
    left join semantic on semantic.id = candidate.id
    left join lexical on lexical.id = candidate.id
    group by candidate.id
  )
  select e.id, e.source_id, e.title, e.ordinal, e.content, e.location,
    e.token_count, f.semantic_rank, f.lexical_rank, f.semantic_score,
    f.lexical_score, f.rrf_score
  from fused f join eligible e on e.id = f.id
  order by f.rrf_score desc, e.id;
end;
$$;

revoke all on function public.hybrid_search_chunks(uuid, uuid[], text, extensions.halfvec, integer, integer, integer) from public, anon;
grant execute on function public.hybrid_search_chunks(uuid, uuid[], text, extensions.halfvec, integer, integer, integer) to authenticated;
