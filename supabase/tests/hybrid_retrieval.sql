-- Reproducible connected-project smoke test. It requires two existing auth users,
-- creates isolated fixtures, checks positive retrieval and cross-user denial, and
-- rolls every fixture back.
begin;

do $$
declare
  user_a uuid;
  user_b uuid;
  notebook_a uuid := gen_random_uuid();
  notebook_b uuid := gen_random_uuid();
  source_a uuid := gen_random_uuid();
  source_b uuid := gen_random_uuid();
  vector_text text := '[' || '1,' || repeat('0,', 2046) || '0]';
  positive_count integer;
  leaked_count integer;
begin
  select id into user_a from auth.users order by created_at limit 1;
  select id into user_b from auth.users where id <> user_a order by created_at limit 1;
  if user_a is null or user_b is null then raise exception 'two_auth_users_required'; end if;
  insert into public.notebooks (id, owner_id, name) values
    (notebook_a, user_a, 'phase-3-user-a'), (notebook_b, user_b, 'phase-3-user-b');
  insert into public.sources (id, owner_id, notebook_id, kind, status, title, extracted_text) values
    (source_a, user_a, notebook_a, 'pasted_text', 'ready', 'alpha-source', 'reciprocal ranking fusion'),
    (source_b, user_b, notebook_b, 'pasted_text', 'ready', 'private-source', 'secret tenant content');
  insert into public.chunks (owner_id, notebook_id, source_id, ordinal, content, token_count, embedding,
    embedding_provider, embedding_model, pipeline_version) values
    (user_a, notebook_a, source_a, 0, 'reciprocal ranking fusion', 3, vector_text::extensions.halfvec(2048), 'test', 'test', 'test'),
    (user_b, notebook_b, source_b, 0, 'secret tenant content', 3, vector_text::extensions.halfvec(2048), 'test', 'test', 'test');
  perform set_config('request.jwt.claim.sub', user_a::text, true);
  select count(*) into positive_count from public.hybrid_search_chunks(
    notebook_a, array[source_a], 'reciprocal ranking', vector_text::extensions.halfvec(2048), 20, 20, 60);
  if positive_count <> 1 then raise exception 'expected_one_owned_result_got_%', positive_count; end if;
  select count(*) into leaked_count from public.hybrid_search_chunks(
    notebook_b, array[source_b], 'secret tenant content', vector_text::extensions.halfvec(2048), 20, 20, 60);
  if leaked_count <> 0 then raise exception 'cross_user_leak_detected'; end if;
end;
$$;

rollback;
