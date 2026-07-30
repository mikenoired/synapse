# Domain

## Core terminology

- **User**: archive owner and security boundary. All user-created archive data is scoped to one user.
- **Content**: a single archived item. Supported kinds are `note`, `media`, `link`, `todo`, `audio`, and imported document kinds: `doc`, `pdf`, `docx`, `epub`, `xlsx`, `csv`.
- **Tag**: a user-owned label used to classify content. Tag titles are normalized by trimmed, lower-cased comparison for uniqueness.
- **Graph node / edge**: a projection of content and tags used to render relationships. An edge records the relation between nodes.
- **Media / audio**: content whose payload references a user-owned MinIO object and optional derivatives/metadata.
- **Document**: imported content with extracted text, optional thumbnail, and optional uploaded embedded images.
- **AI usage**: an auditable record of an AI request's provider, model, token/cost data, result status, and latency.

## Relationships

```text
User 1 ── * Content
User 1 ── * Tag
Content * ── * Tag     (content_tags)
User 1 ── * Node
Node  * ── * Edge      (directed from_node → to_node)
User 1 ── * AI usage
```

- Creating or updating tagged content creates/updates a content node and required tag nodes, then maintains their graph edges.
- A content item can carry many tags; filtering by multiple tags requires all selected tags.
- A tag and its graph node are both user-scoped. Tags are not global/shared in the current schema.

## Invariants

- Data reads and mutations must be restricted to the authenticated user's `userId`.
- A non-empty user tag title is unique after `lower(trim(title))`; the installed database trigger merges historical duplicates and preserves associations.
- A content/tag pair is unique in `content_tags`.
- Content lifecycle must keep relational tags, graph nodes/edges, indexed search text, and owned stored objects consistent. Content service transactions cover relational/graph updates; object cleanup follows the database operation.
- Search text is derived from title, payload-extracted text, and tag titles. It is not user-authored separately.
- AI usage keeps `contentId` without a foreign key deliberately, so usage history survives content deletion.

## Principal workflows

### Create or edit content

1. Validate a type-specific content payload and requested tags.
2. For notes, upload/normalize owned inline images; for imports, parse source files and persist document images when present.
3. Persist content; resolve/create tags; synchronize tag joins plus graph projection.
4. regenerate indexed search text, invalidate tag-related cache, and return a validated content DTO.

### Upload media

1. Validate encoded upload input and require an authenticated user.
2. Dispatch to image, video, or audio handler.
3. Store the object and generated metadata/thumbnail (and audio cover where applicable) in MinIO.
4. Create a corresponding content item and adjust derived Redis storage counters.

### Search and browsing

- Non-search lists use newest-first keyset pagination.
- Search uses PostgreSQL Russian full-text search, ranks matches, and combines optional type/tag filters.
- List responses truncate non-media/textual payloads; detail retrieval returns the complete payload.

### AI tag suggestions

- Suggestions work for a draft (text or image) or an existing content item.
- The service uses text extraction or image vision as appropriate, returns existing tag IDs and new tag names, and records usage whether the provider call succeeds or fails.
