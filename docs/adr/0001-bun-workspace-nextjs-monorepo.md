# Bun workspace with a Next.js web application

## Status

Accepted

## Context

Synapse has a primary web application plus shared UI and TypeScript configuration packages. The repository requires a single package-management and quality-command surface.

## Decision

Use Bun workspaces as the monorepo runtime/package manager. Keep the primary full-stack product in `apps/web` on Next.js App Router, and share UI primitives/configuration through workspace packages.

## Consequences

- Workspace package references use `workspace:*` and commands can target `@synapse/web`.
- Shared UI stays decoupled from application route/server concerns.
- The separate Python search-engine harness remains outside the web runtime dependency graph.
