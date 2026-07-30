# Architecture

## System shape

- **Synapse** is a private, multi-user personal archive for notes, links, documents, media, audio, and todos. It adds tag-based organization, a content/tag graph, full-text search, and optional AI tag suggestions.
- Bun workspace monorepo:
  - `apps/web`: primary full-stack web application.
  - `packages/ui`: reusable React UI primitives.
  - `packages/tsconfig`: shared TypeScript configurations.
  - `apps/search-engine`: standalone Python evaluation harness; it is not part of the runtime application.
- Runtime infrastructure: PostgreSQL 15, Redis 7, and MinIO. Docker Compose defines the local infrastructure; no production deployment definition is committed.

## Technology stack

- TypeScript, Bun 1.3.14+, React 19, Next.js 16 App Router.
- tRPC 11 with Zod validation and SuperJSON transport serialization.
- Drizzle ORM over `postgres` for PostgreSQL.
- TanStack React Query for client server-state; Next Themes and dedicated React contexts for client UI state.
- Tailwind CSS, Radix UI, Framer Motion, Tiptap editor.
- MinIO/S3-compatible object storage for uploaded binary assets; Sharp and FFmpeg-dependent handlers create media derivatives.
- Redis provides cache, storage-usage counters, and rate limiting.
- Optional Z.ai-compatible LLM integration for tag suggestions.

## Project layout and dependency flow

```text
apps/web/src/app       Next routes, layouts, API route handlers, providers
apps/web/src/features  User-facing use cases and feature-local state/UI
apps/web/src/entities  Reusable domain presentation components
apps/web/src/widgets   Composite UI blocks (sidebar, dialogs, viewers, editor)
apps/web/src/shared    Cross-cutting client code, schemas, config, design tokens
apps/web/src/server    tRPC, services, repositories, DB, integrations, parsers
packages/ui            Framework-agnostic shared component library
```

- Client UI depends on `features`, `entities`, `widgets`, `shared`, and `@synapse/ui`.
- Client-to-server calls use the typed `shared/api/trpc` client.
- Server flow is **router → service → repository → database/infrastructure**. Routers own transport validation; services own workflows; repositories own persistence and enforce ownership queries.
- Shared Zod schemas in `shared/lib/schemas.ts` define the principal client/server content contracts.
- Do not introduce server imports into client components. Keep infrastructure access inside `src/server` or the explicitly shared MinIO client helpers.

## Request and rendering lifecycle

1. Next App Router serves the landing page and `/dashboard` route tree. Server and client components are mixed; interactive features/components use client-side React.
2. Root `Providers` composes auth, tRPC/React Query, user preferences, theme, modal, and toast providers.
3. Browser tRPC requests batch to `GET`/`POST /api/trpc`; request context resolves the authenticated user from a bearer token, refreshed middleware header, or cookies.
4. Middleware (`src/proxy.ts`) validates access JWTs, renews them from valid refresh JWTs, and forwards replacement tokens to downstream server code.
5. tRPC applies CSRF origin checking for production mutations and Redis-backed query/mutation limits. Protected procedures require an authenticated context.
6. Services execute domain work, including database transactions where content, tags, and graph records must remain aligned. Repositories scope persisted records by `userId`.
7. React Query caches results client-side; its default query stale time is one minute.

## Storage and deployment model

- PostgreSQL holds users, archive metadata/content payloads, tags, graph data, and AI usage records.
- MinIO holds user-namespaced uploaded media, document images, and note images. `/api/files/[...path]` authorizes the requester then redirects to a one-hour presigned MinIO URL.
- Redis is an operational store, not the source of truth for archive records. It stores cache values, rate-limit windows, and derived user storage counters.
- Local startup uses `docker compose up -d`, then runs Drizzle schema push plus the tag-merge and search-backfill scripts. The application runs independently via `bun --filter @synapse/web dev`.

## Boundaries worth preserving

- Content's `content` field is a type-dependent serialized payload; parsers/format-specific helpers interpret it rather than adding per-type database tables.
- Content-to-tag relationships are mirrored into the graph projection. Preserve both representations together in content-service transactions.
- Binary file delivery is gated through the application route; do not expose unrestricted MinIO object URLs.
