# Open questions

- The committed Dockerfile contains only an FFmpeg installation command; a production image build and deployment target are not defined in the repository.
- The README calls for `db:push` plus manually installed SQL/backfill scripts, while a full committed Drizzle migration history is not present. The intended production migration workflow is therefore not explicit.
- `THUMBNAIL_SERVICE_ENDPOINT` is documented in the example environment but no corresponding in-repository service boundary is visible.
