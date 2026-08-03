# API

## Style and transport

- Primary API: type-safe tRPC over HTTP at `/api/trpc`, with HTTP batching and SuperJSON.
- Inputs are validated by Zod at router boundaries. tRPC error formatting includes Zod field errors.
- The React client is generated from `AppRouter` and uses React Query. Browser requests send cookies with `credentials: "include"`.
- API responses from the tRPC route use `Cache-Control: no-store`.

## tRPC namespaces

| Namespace | Procedures                                                                                   |
| --------- | -------------------------------------------------------------------------------------------- |
| `auth`    | `register`, `login`, `refresh`, `logout`                                                     |
| `content` | `getAll`, `getById`, `create`, `update`, `delete`, tag queries, type discovery, `importFile` |
| `upload`  | `formData` (image, video, audio ingest)                                                      |
| `graph`   | `getGraph`                                                                                   |
| `user`    | `getUser`, `getStorageUsage`, `getPreferences`, `updatePreferences`                          |
| `ai`      | `suggestTags`, `getUsageOverview`                                                            |

## Authentication and authorization

- Credentials use bcrypt password hashes. Auth endpoints issue signed access and refresh JWTs.
- Cookies: `synapse_token` access token (one day) and `synapse_refresh_token` refresh token (seven days); both are `httpOnly`, `sameSite=strict`, and secure in production.
- `proxy.ts` refreshes an expired/missing access token from a valid refresh token and passes replacement token headers to the request context.
- Context accepts bearer token, middleware-forwarded token, or session cookies. `protectedProcedure` requires a resolved user.
- Repositories enforce the user boundary on data access. The file route additionally verifies the MinIO path's user segment before issuing a presigned redirect.

## Request protection

- All procedures receive Redis-backed limits: default query and mutation limits are independently configurable with `TRPC_RATE_*` environment variables.
- Production tRPC mutations reject a supplied `Origin` whose host differs from `Host`.
- AI tag generation has a stricter dedicated per-identity Redis limit (`AI_TAG_RATE_*`).

## REST-like Next route handlers

- `/api/session`: browser session-cookie creation/deletion.
- `/api/user`: current authenticated user.
- `/api/files/[...path]`: authorized MinIO asset retrieval through an HTTP redirect.
- `/api/parse-link`: authenticated remote HTML fetch and metadata/content extraction. It allows only `text/html` responses and has a 10-second fetch timeout.

## External integrations

- **PostgreSQL**: application data and Russian full-text search.
- **Redis**: caching, rate limits, storage accounting.
- **MinIO/S3**: private media/object storage and presigned URL creation.
- **Z.ai API**: current LLM provider for structured tag suggestions and image vision. The provider interface is intentionally extensible.
- **FFmpeg/Sharp and document libraries**: server-side ingestion, metadata extraction, thumbnails, and derivative image processing.
