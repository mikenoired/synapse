# Layered tRPC server boundary

## Status

Accepted

## Context

The application needs typed browser/server communication while coordinating authentication, validation, archive ownership, database transactions, cache, and object storage side effects.

## Decision

Expose application operations through tRPC namespaces. Use routers for validated transport entry points, services for domain workflows, and repositories for persistence. Construct a request context that carries database, cache, request metadata, and authenticated identity.

## Consequences

- Client procedures remain type-safe through `AppRouter` and share Zod contracts.
- Authorization is consistently available and must be enforced in repository queries.
- Cross-entity mutations have a clear service-layer home for transactions and side effects.
- Small HTTP route handlers remain only where standard HTTP behavior is necessary (sessions, assets, link parsing).
