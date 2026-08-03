-- Kyvena product foundation. Applied remotely as migration 20260803000426.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create extension if not exists vector with schema extensions;

create type public.source_kind as enum ('txt', 'md', 'pdf', 'pasted_text');
create type public.source_status as enum ('pending', 'processing', 'ready', 'retryable_error', 'permanent_error', 'deleted');
create type public.ingestion_stage as enum ('queued', 'extracting', 'chunking', 'embedding', 'persisting', 'completed', 'failed');
create type public.message_role as enum ('user', 'assistant');
create type public.request_status as enum ('pending', 'reviewed', 'approved', 'rejected');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  locale text not null default 'es' check (locale in ('es', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.access_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) between 3 and 320),
  message text not null check (char_length(message) between 10 and 2000),
  locale text not null default 'es' check (locale in ('es', 'en')),
  status public.request_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.notebooks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id)
);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  notebook_id uuid not null,
  kind public.source_kind not null,
  status public.source_status not null default 'pending',
  title text not null check (char_length(title) between 1 and 240),
  storage_path text,
  mime_type text,
  byte_size bigint check (byte_size between 0 and 5242880),
  content_hash text,
  extracted_characters integer check (extracted_characters between 0 and 250000),
  page_count integer check (page_count between 0 and 75),
  error_code text,
  error_detail text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id, notebook_id),
  foreign key (notebook_id, owner_id) references public.notebooks(id, owner_id) on delete cascade,
  check ((kind = 'pasted_text' and storage_path is null) or kind <> 'pasted_text')
);

create table public.ingestion_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  notebook_id uuid not null,
  source_id uuid not null,
  stage public.ingestion_stage not null default 'queued',
  attempt smallint not null default 1 check (attempt between 1 and 3),
  idempotency_key text not null,
  started_at timestamptz,
  completed_at timestamptz,
  error_code text,
  error_detail text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, idempotency_key),
  foreign key (source_id, owner_id, notebook_id) references public.sources(id, owner_id, notebook_id) on delete cascade
);

create table public.chunks (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  notebook_id uuid not null,
  source_id uuid not null,
  ordinal smallint not null check (ordinal between 0 and 149),
  content text not null,
  location jsonb not null default '{}'::jsonb,
  token_count integer not null check (token_count > 0),
  embedding extensions.halfvec(2048) not null,
  embedding_provider text not null,
  embedding_model text not null,
  pipeline_version text not null,
  search_vector tsvector generated always as (to_tsvector('simple', content)) stored,
  created_at timestamptz not null default now(),
  unique (id, owner_id),
  unique (source_id, ordinal),
  foreign key (source_id, owner_id, notebook_id) references public.sources(id, owner_id, notebook_id) on delete cascade
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  notebook_id uuid not null,
  title text not null default 'Nueva conversación' check (char_length(title) between 1 and 160),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id, notebook_id),
  foreign key (notebook_id, owner_id) references public.notebooks(id, owner_id) on delete cascade
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  notebook_id uuid not null,
  conversation_id uuid not null,
  role public.message_role not null,
  content text not null check (char_length(content) between 1 and 50000),
  model_requested text,
  model_effective text,
  error_code text,
  created_at timestamptz not null default now(),
  unique (id, owner_id),
  foreign key (conversation_id, owner_id, notebook_id) references public.conversations(id, owner_id, notebook_id) on delete cascade
);

create table public.message_citations (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  message_id uuid not null,
  chunk_id bigint not null,
  ordinal smallint not null check (ordinal >= 1),
  quote text not null check (char_length(quote) between 1 and 2000),
  created_at timestamptz not null default now(),
  unique (message_id, ordinal),
  foreign key (message_id, owner_id) references public.messages(id, owner_id) on delete cascade,
  foreign key (chunk_id, owner_id) references public.chunks(id, owner_id) on delete cascade
);

create table public.message_feedback (
  message_id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  helpful boolean not null,
  comment text check (char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (message_id, owner_id) references public.messages(id, owner_id) on delete cascade
);

create index notebooks_owner_updated_idx on public.notebooks(owner_id, updated_at desc);
create index sources_owner_notebook_status_idx on public.sources(owner_id, notebook_id, status);
create index ingestion_jobs_owner_stage_idx on public.ingestion_jobs(owner_id, stage, created_at);
create index chunks_owner_notebook_source_idx on public.chunks(owner_id, notebook_id, source_id);
create index chunks_search_vector_idx on public.chunks using gin(search_vector);
create index chunks_embedding_hnsw_idx on public.chunks using hnsw (embedding extensions.halfvec_cosine_ops);
create index conversations_owner_notebook_updated_idx on public.conversations(owner_id, notebook_id, updated_at desc);
create index messages_owner_conversation_created_idx on public.messages(owner_id, conversation_id, created_at);
create index citations_owner_message_idx on public.message_citations(owner_id, message_id);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;
revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger profiles_updated_at before update on public.profiles for each row execute function private.set_updated_at();
create trigger notebooks_updated_at before update on public.notebooks for each row execute function private.set_updated_at();
create trigger sources_updated_at before update on public.sources for each row execute function private.set_updated_at();
create trigger ingestion_jobs_updated_at before update on public.ingestion_jobs for each row execute function private.set_updated_at();
create trigger conversations_updated_at before update on public.conversations for each row execute function private.set_updated_at();
create trigger message_feedback_updated_at before update on public.message_feedback for each row execute function private.set_updated_at();
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

alter table public.profiles enable row level security;
alter table public.access_requests enable row level security;
alter table public.notebooks enable row level security;
alter table public.sources enable row level security;
alter table public.ingestion_jobs enable row level security;
alter table public.chunks enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.message_citations enable row level security;
alter table public.message_feedback enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy access_requests_insert on public.access_requests for insert to anon, authenticated with check (status = 'pending');

create policy notebooks_select_own on public.notebooks for select to authenticated using ((select auth.uid()) = owner_id);
create policy notebooks_insert_own on public.notebooks for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy notebooks_update_own on public.notebooks for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy notebooks_delete_own on public.notebooks for delete to authenticated using ((select auth.uid()) = owner_id);

create policy sources_all_own on public.sources for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy ingestion_jobs_all_own on public.ingestion_jobs for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy chunks_all_own on public.chunks for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy conversations_all_own on public.conversations for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy messages_all_own on public.messages for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy citations_all_own on public.message_citations for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy feedback_all_own on public.message_feedback for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

revoke all on all tables in schema public from anon, authenticated;
grant insert (name, email, message, locale) on public.access_requests to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.notebooks, public.sources, public.ingestion_jobs, public.chunks, public.conversations, public.messages, public.message_citations, public.message_feedback to authenticated;
grant usage, select on all sequences in schema public to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sources', 'sources', false, 5242880, array['text/plain', 'text/markdown', 'application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy source_objects_select_own on storage.objects for select to authenticated
using (bucket_id = 'sources' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy source_objects_insert_own on storage.objects for insert to authenticated
with check (bucket_id = 'sources' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy source_objects_update_own on storage.objects for update to authenticated
using (bucket_id = 'sources' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'sources' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy source_objects_delete_own on storage.objects for delete to authenticated
using (bucket_id = 'sources' and (storage.foldername(name))[1] = (select auth.uid())::text);
