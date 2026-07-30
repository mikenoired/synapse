# Unified content records with derived search and graph projections

## Status

Accepted

## Context

The archive accepts heterogeneous item types but needs a single browsing, tagging, search, and graph experience. Binary assets belong in object storage rather than the relational database.

## Decision

Store all archive items in one `content` entity with a type discriminator and type-specific serialized payload. Store object binaries in MinIO. Derive searchable text/tsvector and maintain content/tag graph nodes and edges alongside tag relations during content workflows.

## Consequences

- Adding a content kind normally extends schemas, parsers/viewers, and payload helpers instead of adding a new table.
- Services must keep content, tags, graph projection, and derived search state synchronized.
- PostgreSQL full-text search can query a unified corpus while object storage retains large files.
