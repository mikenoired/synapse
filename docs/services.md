# Services and modules

## Server application modules

| Module                               | Responsibility                                                                                                                                     | Inputs → outputs                                                                           | Dependencies / public interface                                                                       |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `routers/auth` + `AuthService`       | Registration, login, refresh, logout.                                                                                                              | Credentials → user plus access/refresh JWTs.                                               | `AuthRepository`, bcrypt, JWT helpers. tRPC `auth.*`.                                                 |
| `routers/content` + `ContentService` | Content CRUD, tag views, type discovery, and document import. Synchronizes tags, graph, search text, note/document assets, and caches.             | Validated content/filter/import input → content DTOs, tag DTOs, paged lists.               | `ContentRepository`, DB transaction, parsers, MinIO helpers, Redis cache. tRPC `content.*`.           |
| `routers/upload` + `UploadService`   | Media/audio ingest and handler selection.                                                                                                          | Base64-like file input, title/tags/options → created content items.                        | Image/video/audio upload handlers, MinIO, `ContentService`. tRPC `upload.formData`.                   |
| `routers/graph` + `GraphService`     | Read-only graph projection for the dashboard visualization.                                                                                        | Authenticated user → user-owned nodes and edges.                                           | `GraphRepository`. tRPC `graph.getGraph`.                                                             |
| `routers/user` + `UserService`       | Account read, preferences, and derived storage usage.                                                                                              | Preferences patch → preferences; user request → profile/storage.                           | `UserRepository`, `CacheRepository`. tRPC `user.*`.                                                   |
| `routers/ai` + `AiTaggingService`    | AI tag suggestions and AI usage overview.                                                                                                          | Draft/existing content → suggested existing/new tags; authenticated user → usage overview. | Provider abstraction, content/usage repositories, image vision, dedicated Redis limiter. tRPC `ai.*`. |
| `repositories/*`                     | Persistence adapters and authorization-scoped queries.                                                                                             | Service calls → Drizzle/Redis results.                                                     | `Context`; PostgreSQL or Redis. They are not transport APIs.                                          |
| `server/parsers`                     | Extract text, metadata, images, and thumbnails from supported document formats.                                                                    | In-memory imported file → normalized parsed document.                                      | Format libraries, Sharp/PDF tooling. Used by `ContentService.importFile`.                             |
| `server/ai`                          | Provider-neutral LLM contract, provider selection, prompts, pricing, and structured logging.                                                       | Completion request → typed JSON completion with usage.                                     | Current provider is Z.ai (`providers/zai.provider.ts`).                                               |
| `server/lib`                         | Cross-cutting server utilities: JWT/session/auth guard, PostgreSQL search text, rate limiter, image/document processing, and note-image ownership. | Helper-specific.                                                                           | Used by routes/services/repositories; avoid putting domain orchestration here.                        |

## HTTP route modules outside tRPC

| Route                  | Responsibility                                                    | Authentication                                         |
| ---------------------- | ----------------------------------------------------------------- | ------------------------------------------------------ |
| `/api/trpc/[trpc]`     | tRPC HTTP adapter for all typed APIs.                             | Procedure-specific.                                    |
| `/api/session`         | Stores or clears validated JWT session cookies.                   | Validates supplied access token on `POST`.             |
| `/api/user`            | Returns current session user for browser auth bootstrap.          | Required.                                              |
| `/api/files/[...path]` | Validates user namespace and redirects to a presigned MinIO URL.  | Required; query token is also accepted for this route. |
| `/api/parse-link`      | Fetches an HTML URL and returns normalized link content/metadata. | Required.                                              |

## Client modules

- `app`: route composition, layouts, metadata, and global providers. Dashboard pages are the authenticated working area.
- `features`: cohesive user actions such as adding content, editing content, filtering, settings, authentication dialog, and theme controls.
- `entities/item`: presentation of an archive item and its media/document/tag variants.
- `widgets`: reusable composed UI (content viewer, editor, modal system, sidebar, settings modal).
- `shared`: tRPC and MinIO client helpers, schemas, contexts, i18n, URL-query synchronization, design tokens, and generic utilities.
- `@synapse/ui`: exported primitive component collection and styling utilities; use its barrel exports rather than application-internal paths.

## Background/operational modules

- `server/scripts/backfill-search-text.ts`: rebuilds derived search text/index input for existing content.
- `server/scripts/apply-tag-merge-db.ts`: installs the duplicate-tag merge function, trigger, and uniqueness indexes.
- `server/scripts/apply-god-mode-existing.ts`: one-time plan update utility for existing users.
- `apps/search-engine`: local Python benchmark tool for exported corpus evaluation (baseline, PostgreSQL FTS, SQLite BM25, hybrid RRF); no live application dependency.
