# Kyvena

Kyvena is a bilingual ES/EN learning product for building and understanding a
source-grounded RAG architecture. The MVP accepts TXT, Markdown, text-based PDF,
and pasted text, then answers with navigable evidence.

## Current implementation

- Next.js App Router foundation on Node.js 22.
- Approved Kyvena visual direction and bilingual login.
- Email/password Supabase SSR authentication without public signup.
- Access-request form connected to the protected `access_requests` table.
- Protected notebook home and notebook creation flow.
- Applied Supabase foundation with RLS, private Storage, `halfvec(2048)`,
  HNSW cosine indexing, ingestion state, conversations, citations, and feedback.

Document ingestion and RAG chat are not implemented yet.

## Local setup

1. Use Node.js 22 or newer.
2. Install dependencies with `npm install`.
3. Copy the documented variables from `.env.example` into `.env.local`.
4. Add the Supabase project URL and publishable key. The current development project
   is already configured locally; never commit their values.
5. Follow `supabase/README.md` for future schema changes and type generation.
6. Run `npm run dev`.

Never expose a Supabase secret/service-role key or `OPENROUTER_API_KEY` through a
`NEXT_PUBLIC_` variable.

## Verification

```text
npm run lint
npm run build
```

The product and architecture decisions live under `docs/`; read `AGENTS.md` before
making implementation changes.
