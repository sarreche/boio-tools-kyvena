-- Qualify source identifiers in the reservation function. The original name
-- collided with ingestion_jobs.source_id under PL/pgSQL variable resolution.
create or replace function public.reserve_ingestion_source(
  p_notebook_id uuid,
  p_kind public.source_kind,
  p_title text,
  p_content_hash text,
  p_byte_size bigint default null,
  p_mime_type text default null,
  p_extracted_text text default null,
  p_daily_limit integer default 5
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner uuid := (select auth.uid());
  v_source_id uuid := gen_random_uuid();
  object_path text;
  v_idempotency_key text;
begin
  if owner is null then return jsonb_build_object('status', 'error', 'code', 'authentication_required'); end if;
  if p_daily_limit not between 1 and 100 then return jsonb_build_object('status', 'error', 'code', 'invalid_daily_limit'); end if;
  if not exists (select 1 from public.notebooks n where n.id = p_notebook_id and n.owner_id = owner) then
    return jsonb_build_object('status', 'error', 'code', 'notebook_not_found');
  end if;
  if p_kind not in ('txt', 'md', 'pdf', 'pasted_text') then return jsonb_build_object('status', 'error', 'code', 'unsupported_file_type'); end if;
  if char_length(p_title) not between 1 and 240 or p_content_hash !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('status', 'error', 'code', 'invalid_source_metadata');
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner::text, 0));
  with stale as (
    update public.ingestion_jobs j
       set stage = 'failed', completed_at = now(), error_code = 'ingestion_abandoned'
     where j.owner_id = owner and j.stage not in ('completed', 'failed')
       and j.updated_at < now() - interval '10 minutes'
     returning j.source_id
  )
  update public.sources s
     set status = 'retryable_error', error_code = 'ingestion_abandoned'
   where s.owner_id = owner and s.id in (select stale.source_id from stale);

  v_idempotency_key := case when p_kind = 'pasted_text' then 'pasted:' else 'file:' end || p_notebook_id::text || ':' || p_content_hash;
  if exists (select 1 from public.ingestion_jobs j where j.owner_id = owner and j.idempotency_key = v_idempotency_key) then
    return jsonb_build_object('status', 'duplicate');
  end if;
  if exists (select 1 from public.ingestion_jobs j where j.owner_id = owner and j.stage not in ('completed', 'failed')) then
    return jsonb_build_object('status', 'error', 'code', 'ingestion_busy');
  end if;
  if (select count(*) from public.sources s where s.owner_id = owner and s.notebook_id = p_notebook_id and s.status <> 'deleted') >= 20 then
    return jsonb_build_object('status', 'error', 'code', 'source_limit');
  end if;
  if (select count(*) from public.sources s where s.owner_id = owner and s.status <> 'deleted') >= 75 then
    return jsonb_build_object('status', 'error', 'code', 'total_source_limit');
  end if;
  if coalesce((select sum(s.byte_size) from public.sources s where s.owner_id = owner and s.status <> 'deleted'), 0) + coalesce(p_byte_size, 0) > 52428800 then
    return jsonb_build_object('status', 'error', 'code', 'storage_limit');
  end if;
  if (select count(*) from public.ingestion_jobs j where j.owner_id = owner and j.created_at >= date_trunc('day', now())) >= p_daily_limit then
    return jsonb_build_object('status', 'error', 'code', 'daily_ingestion_limit');
  end if;

  if p_kind = 'pasted_text' then
    if p_extracted_text is null or char_length(p_extracted_text) not between 1 and 100000 then
      return jsonb_build_object('status', 'error', 'code', 'invalid_file_content');
    end if;
  else
    if p_byte_size not between 1 and 5242880 or p_mime_type is null then
      return jsonb_build_object('status', 'error', 'code', 'invalid_source_metadata');
    end if;
    object_path := owner::text || '/' || p_notebook_id::text || '/' || v_source_id::text || '/original';
  end if;

  insert into public.sources (id, owner_id, notebook_id, kind, status, title, storage_path, mime_type, byte_size, content_hash, extracted_text, extracted_characters)
  values (v_source_id, owner, p_notebook_id, p_kind, 'pending', p_title, object_path, p_mime_type, p_byte_size, p_content_hash,
    p_extracted_text, case when p_extracted_text is null then null else char_length(p_extracted_text) end);
  insert into public.ingestion_jobs (owner_id, notebook_id, source_id, idempotency_key)
  values (owner, p_notebook_id, v_source_id, v_idempotency_key);
  return jsonb_build_object('status', 'reserved', 'sourceId', v_source_id, 'storagePath', object_path);
end;
$$;
