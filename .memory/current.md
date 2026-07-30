# Current state

- The main archive application is implemented: authentication, content CRUD, tag filtering, full-text search, graph viewing, media/audio uploads, document imports, user preferences, theme selection, and AI tag suggestions are present.
- The local runtime expects PostgreSQL, Redis, MinIO, and FFmpeg for audio/video uploads. The README documents initial schema setup, duplicate-tag migration installation, and search backfill.
- Search uses PostgreSQL Russian full-text search in production code. A separate Python harness exists to compare baseline, PostgreSQL FTS, SQLite BM25, and hybrid RRF approaches.
- Current source-tree tests cover selected server content/search/image helpers and editor input; test coverage is not comprehensive.
- The working tree already contains unrelated modifications to `packages/ui/src/components/tabs-subtle/tabs-subtle.tsx` and `packages/ui/tsconfig.json`; do not overwrite them without explicit intent.
