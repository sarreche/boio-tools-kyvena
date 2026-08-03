-- Persist normalized source text before chunking. This is required for pasted text
-- and keeps extraction output available for retries without re-reading the upload.
alter table public.sources
  add column extracted_text text,
  add constraint sources_extracted_text_length
    check (extracted_text is null or char_length(extracted_text) <= 250000),
  add constraint pasted_text_requires_content
    check (kind <> 'pasted_text' or (extracted_text is not null and char_length(extracted_text) between 1 and 100000));
