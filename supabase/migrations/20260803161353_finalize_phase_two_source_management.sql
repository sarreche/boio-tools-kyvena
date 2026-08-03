-- Close the phase-two source lifecycle with atomic reservation, per-user
-- concurrency, configurable daily quotas, retry, and reprocessing.

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
  source_id uuid := gen_random_uuid();
  object_path text;
  v_idempotency_key text;
begin
  if owner is null then return jsonb_build_object('status', 'error', 'code', 'authentication_required'); end if;
  if p_daily_limit not between 1 and 100 then return jsonb_build_object('status', 'error', 'code', 'invalid_daily_limit'); end if;
  if not exists (select 1 from public.notebooks where id = p_notebook_id and owner_id = owner) then
    return jsonb_build_object('status', 'error', 'code', 'notebook_not_found');
  end if;
  if p_kind not in ('txt', 'md', 'pdf', 'pasted_text') then return jsonb_build_object('status', 'error', 'code', 'unsupported_file_type'); end if;
  if char_length(p_title) not between 1 and 240 or p_content_hash !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('status', 'error', 'code', 'invalid_source_metadata');
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner::text, 0));

  -- Convert abandoned in-flight work into an explicit, recoverable state.
  with stale as (
    update public.ingestion_jobs
       set stage = 'failed', completed_at = now(), error_code = 'ingestion_abandoned'
     where owner_id = owner and stage not in ('completed', 'failed')
       and updated_at < now() - interval '10 minutes'
     returning source_id
  )
  update public.sources s
     set status = 'retryable_error', error_code = 'ingestion_abandoned'
   where s.owner_id = owner and s.id in (select source_id from stale);

  v_idempotency_key := case when p_kind = 'pasted_text' then 'pasted:' else 'file:' end || p_notebook_id::text || ':' || p_content_hash;
  if exists (select 1 from public.ingestion_jobs where owner_id = owner and idempotency_key = v_idempotency_key) then
    return jsonb_build_object('status', 'duplicate');
  end if;
  if exists (
    select 1 from public.ingestion_jobs
    where owner_id = owner and stage not in ('completed', 'failed')
  ) then return jsonb_build_object('status', 'error', 'code', 'ingestion_busy'); end if;
  if (select count(*) from public.sources where owner_id = owner and notebook_id = p_notebook_id and status <> 'deleted') >= 20 then
    return jsonb_build_object('status', 'error', 'code', 'source_limit');
  end if;
  if (select count(*) from public.sources where owner_id = owner and status <> 'deleted') >= 75 then
    return jsonb_build_object('status', 'error', 'code', 'total_source_limit');
  end if;
  if coalesce((select sum(byte_size) from public.sources where owner_id = owner and status <> 'deleted'), 0) + coalesce(p_byte_size, 0) > 52428800 then
    return jsonb_build_object('status', 'error', 'code', 'storage_limit');
  end if;
  if (select count(*) from public.ingestion_jobs where owner_id = owner and created_at >= date_trunc('day', now())) >= p_daily_limit then
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
    object_path := owner::text || '/' || p_notebook_id::text || '/' || source_id::text || '/original';
  end if;

  insert into public.sources (id, owner_id, notebook_id, kind, status, title, storage_path, mime_type, byte_size, content_hash, extracted_text, extracted_characters)
  values (source_id, owner, p_notebook_id, p_kind, 'pending', p_title, object_path, p_mime_type, p_byte_size, p_content_hash,
    p_extracted_text, case when p_extracted_text is null then null else char_length(p_extracted_text) end);
  insert into public.ingestion_jobs (owner_id, notebook_id, source_id, idempotency_key)
  values (owner, p_notebook_id, source_id, v_idempotency_key);

  return jsonb_build_object('status', 'reserved', 'sourceId', source_id, 'storagePath', object_path);
end;
$$;

create or replace function public.create_owned_notebook(p_name text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner uuid := (select auth.uid());
  notebook_id uuid;
begin
  if owner is null then return jsonb_build_object('status', 'error', 'code', 'authentication_required'); end if;
  if char_length(p_name) not between 1 and 120 then return jsonb_build_object('status', 'error', 'code', 'invalid_notebook_name'); end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner::text, 0));
  if (select count(*) from public.notebooks where owner_id = owner) >= 10 then
    return jsonb_build_object('status', 'error', 'code', 'notebook_limit');
  end if;
  insert into public.notebooks (owner_id, name) values (owner, p_name) returning id into notebook_id;
  return jsonb_build_object('status', 'created', 'notebookId', notebook_id);
end;
$$;

create or replace function public.requeue_source_ingestion(
  p_source_id uuid,
  p_notebook_id uuid,
  p_daily_limit integer default 5
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner uuid := (select auth.uid());
  source_status public.source_status;
  failed_job public.ingestion_jobs%rowtype;
begin
  if owner is null then return jsonb_build_object('status', 'error', 'code', 'authentication_required'); end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner::text, 0));
  select status into source_status from public.sources
   where id = p_source_id and notebook_id = p_notebook_id and owner_id = owner and status in ('ready', 'retryable_error');
  if source_status is null then return jsonb_build_object('status', 'error', 'code', 'source_not_retryable'); end if;
  if exists (select 1 from public.ingestion_jobs where owner_id = owner and stage not in ('completed', 'failed')) then
    return jsonb_build_object('status', 'error', 'code', 'ingestion_busy');
  end if;

  if source_status = 'retryable_error' then
    select * into failed_job from public.ingestion_jobs
     where source_id = p_source_id and owner_id = owner and stage = 'failed' order by created_at desc limit 1;
    if failed_job.id is null or failed_job.attempt >= 3 then
      return jsonb_build_object('status', 'error', 'code', 'retry_limit');
    end if;
    update public.ingestion_jobs set stage = 'queued', attempt = attempt + 1, started_at = null, completed_at = null,
      error_code = null, error_detail = null where id = failed_job.id and owner_id = owner;
  else
    if (select count(*) from public.ingestion_jobs where owner_id = owner and created_at >= date_trunc('day', now())) >= p_daily_limit then
      return jsonb_build_object('status', 'error', 'code', 'daily_ingestion_limit');
    end if;
    insert into public.ingestion_jobs (owner_id, notebook_id, source_id, idempotency_key)
    values (owner, p_notebook_id, p_source_id, 'reprocess:' || p_source_id::text || ':' || gen_random_uuid()::text);
  end if;
  update public.sources set status = 'pending', error_code = null, error_detail = null where id = p_source_id and owner_id = owner;
  return jsonb_build_object('status', 'queued');
end;
$$;

revoke all on function public.reserve_ingestion_source(uuid, public.source_kind, text, text, bigint, text, text, integer) from public, anon;
grant execute on function public.reserve_ingestion_source(uuid, public.source_kind, text, text, bigint, text, text, integer) to authenticated;
revoke all on function public.requeue_source_ingestion(uuid, uuid, integer) from public, anon;
grant execute on function public.requeue_source_ingestion(uuid, uuid, integer) to authenticated;
revoke all on function public.create_owned_notebook(text) from public, anon;
grant execute on function public.create_owned_notebook(text) to authenticated;
