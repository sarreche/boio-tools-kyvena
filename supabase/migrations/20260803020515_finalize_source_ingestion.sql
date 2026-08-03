create or replace function public.finalize_source_ingestion(
  p_job_id uuid,
  p_source_id uuid,
  p_notebook_id uuid,
  p_chunks jsonb,
  p_embedding_provider text,
  p_embedding_model text,
  p_pipeline_version text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  item jsonb;
  owner uuid := (select auth.uid());
  parsed_embedding extensions.halfvec(2048);
begin
  if owner is null then raise exception 'authentication_required'; end if;
  if jsonb_typeof(p_chunks) <> 'array' or jsonb_array_length(p_chunks) not between 1 and 150 then
    raise exception 'invalid_chunk_count';
  end if;
  if not exists (
    select 1 from public.ingestion_jobs j join public.sources s on s.id = j.source_id
    where j.id = p_job_id and j.source_id = p_source_id and j.notebook_id = p_notebook_id
      and j.owner_id = owner and j.stage = 'embedding' and s.owner_id = owner and s.status = 'processing'
  ) then raise exception 'ingestion_job_not_ready'; end if;

  delete from public.chunks where source_id = p_source_id and owner_id = owner;
  for item in select value from jsonb_array_elements(p_chunks) loop
    parsed_embedding := (item->>'embedding')::extensions.halfvec(2048);
    if extensions.vector_dims(parsed_embedding) <> 2048 then raise exception 'invalid_embedding_dimensions'; end if;
    insert into public.chunks (owner_id, notebook_id, source_id, ordinal, content, location, token_count, embedding, embedding_provider, embedding_model, pipeline_version)
    values (owner, p_notebook_id, p_source_id, (item->>'ordinal')::smallint, item->>'content', coalesce(item->'location', '{}'::jsonb),
      (item->>'tokenCount')::integer, parsed_embedding, p_embedding_provider, p_embedding_model, p_pipeline_version);
  end loop;

  update public.ingestion_jobs set stage = 'completed', completed_at = now(), error_code = null, error_detail = null where id = p_job_id and owner_id = owner;
  update public.sources set status = 'ready', error_code = null, error_detail = null where id = p_source_id and owner_id = owner;
end;
$$;

revoke all on function public.finalize_source_ingestion(uuid, uuid, uuid, jsonb, text, text, text) from public, anon;
grant execute on function public.finalize_source_ingestion(uuid, uuid, uuid, jsonb, text, text, text) to authenticated;
