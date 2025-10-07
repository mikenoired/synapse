import type { SQLiteDB } from './client'

export async function runMigrations(db: SQLiteDB): Promise<void> {
  try {
    const tableExists = db.selectValue(
      `SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='sync_metadata'`,
    )

    if (tableExists) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('[SQLite] Database already initialized')
      }
      return
    }

    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('[SQLite] Running initial migration...')
    }

    const response = await fetch('/db/schema.sql')
    if (!response.ok) {
      throw new Error(`Failed to load schema: ${response.statusText}`)
    }

    const schema = await response.text()

    db.transaction(() => {
      try {
        db.exec(schema)
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.log('[SQLite] ✓ Schema executed successfully')
        }
      }
      catch (error) {
        console.error('[SQLite] ✗ Schema execution failed:', error)
        throw error
      }
    })

    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('[SQLite] Migration completed successfully')
    }
  }
  catch (error) {
    console.error('[SQLite] Migration failed:', error)
    throw error
  }
}

export async function resetDatabase(db: SQLiteDB): Promise<void> {
  console.warn('[SQLite] Resetting database...')

  const tables = [
    'content_fts',
    'operations',
    'sync_metadata',
    'edges',
    'nodes',
    'content_tags',
    'tags',
    'content',
    'users',
  ]

  db.transaction(() => {
    for (const table of tables) {
      try {
        db.exec(`DROP TABLE IF EXISTS ${table}`)
      }
      catch (error) {
        console.warn(`Failed to drop table ${table}:`, error)
      }
    }
  })

  await runMigrations(db)
}
