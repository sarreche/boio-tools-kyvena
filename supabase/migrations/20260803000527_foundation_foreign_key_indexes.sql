-- Cover composite foreign keys reported by the Supabase performance advisor.

create index sources_notebook_owner_fk_idx on public.sources(notebook_id, owner_id);
create index ingestion_jobs_source_owner_notebook_fk_idx on public.ingestion_jobs(source_id, owner_id, notebook_id);
create index chunks_source_owner_notebook_fk_idx on public.chunks(source_id, owner_id, notebook_id);
create index conversations_notebook_owner_fk_idx on public.conversations(notebook_id, owner_id);
create index messages_conversation_owner_notebook_fk_idx on public.messages(conversation_id, owner_id, notebook_id);
create index citations_message_owner_fk_idx on public.message_citations(message_id, owner_id);
create index citations_chunk_owner_fk_idx on public.message_citations(chunk_id, owner_id);
create index feedback_message_owner_fk_idx on public.message_feedback(message_id, owner_id);
create index feedback_owner_idx on public.message_feedback(owner_id);

