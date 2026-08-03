# Supabase local foundation

The project is connected to Supabase project `boio-tools-kyvena`. The files under
`migrations/` mirror the migration versions applied remotely on 3 August 2026.

For subsequent schema changes:

1. Install or run the current Supabase CLI and confirm its version.
2. Link the local CLI to project ref `xktltzkrnmfncszjphsg` without committing tokens.
3. Create every new migration through `supabase migration new <name>`.
4. Apply changes first to a development environment when one is available.
5. Run security and performance advisors and test RLS with two users.
6. Regenerate `src/types/database.ts` after each applied schema change.

Applied migrations:

- `20260803000426_product_foundation.sql`
- `20260803000527_foundation_foreign_key_indexes.sql`
- `20260803012722_persist_extracted_text.sql`
- `20260803020515_finalize_source_ingestion.sql`
- `20260803161353_finalize_phase_two_source_management.sql`
- `20260803161608_fix_source_reservation_ambiguity.sql`

Current advisor state: no security findings and no missing foreign-key indexes.
“Unused index” informational notices are expected until the empty database receives
representative traffic.

The schema deliberately avoids Edge Functions and an ingestion worker in the MVP.
