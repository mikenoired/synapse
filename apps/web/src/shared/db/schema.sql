-- Local SQLite Schema (mirrors PostgreSQL + sync metadata)
-- This schema is optimized for local-first architecture

-- Sync metadata for all entities
CREATE TABLE IF NOT EXISTS sync_metadata (
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  server_version INTEGER,
  last_modified INTEGER NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK(sync_status IN ('synced', 'pending', 'conflict')),
  tombstone INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (entity_type, entity_id)
);

-- Operation log for tracking changes
CREATE TABLE IF NOT EXISTS operations (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK(operation IN ('create', 'update', 'delete')),
  data TEXT, -- JSON delta or full object
  version INTEGER NOT NULL,
  timestamp INTEGER NOT NULL,
  synced INTEGER NOT NULL DEFAULT 0,
  user_id TEXT NOT NULL
);

-- Users table (minimal, mostly read-only from server)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at INTEGER,
  updated_at INTEGER
);

-- Content table
CREATE TABLE IF NOT EXISTS content (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  title TEXT,
  thumbnail_base64 TEXT,
  created_at INTEGER,
  updated_at INTEGER,
  user_id TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  user_id TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Content-Tags junction table
CREATE TABLE IF NOT EXISTS content_tags (
  content_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  PRIMARY KEY (content_id, tag_id),
  FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Graph nodes table
CREATE TABLE IF NOT EXISTS nodes (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  content TEXT,
  metadata TEXT, -- JSON
  user_id TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Graph edges table
CREATE TABLE IF NOT EXISTS edges (
  id TEXT PRIMARY KEY,
  from_node TEXT NOT NULL,
  to_node TEXT NOT NULL,
  relation_type TEXT NOT NULL,
  user_id TEXT NOT NULL,
  FOREIGN KEY (from_node) REFERENCES nodes(id) ON DELETE CASCADE,
  FOREIGN KEY (to_node) REFERENCES nodes(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_user_id ON content(user_id);
CREATE INDEX IF NOT EXISTS idx_content_type ON content(type);
CREATE INDEX IF NOT EXISTS idx_content_created_at ON content(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_content_tags_content_id ON content_tags(content_id);
CREATE INDEX IF NOT EXISTS idx_content_tags_tag_id ON content_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_nodes_user_id ON nodes(user_id);
CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(type);
CREATE INDEX IF NOT EXISTS idx_edges_from_node ON edges(from_node);
CREATE INDEX IF NOT EXISTS idx_edges_to_node ON edges(to_node);
CREATE INDEX IF NOT EXISTS idx_operations_synced ON operations(synced, timestamp);
CREATE INDEX IF NOT EXISTS idx_operations_entity ON operations(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_metadata_status ON sync_metadata(sync_status);

-- Full-text search for content (SQLite FTS5)
CREATE VIRTUAL TABLE IF NOT EXISTS content_fts USING fts5(
  content_id UNINDEXED,
  title,
  content,
  content='content',
  content_rowid='rowid'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS content_fts_insert AFTER INSERT ON content BEGIN
  INSERT INTO content_fts(rowid, content_id, title, content) 
  VALUES (new.rowid, new.id, new.title, new.content);
END;

CREATE TRIGGER IF NOT EXISTS content_fts_delete AFTER DELETE ON content BEGIN
  DELETE FROM content_fts WHERE content_id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS content_fts_update AFTER UPDATE ON content BEGIN
  DELETE FROM content_fts WHERE content_id = old.id;
  INSERT INTO content_fts(rowid, content_id, title, content) 
  VALUES (new.rowid, new.id, new.title, new.content);
END;

