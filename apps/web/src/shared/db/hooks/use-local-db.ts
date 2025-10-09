import type { SQLiteDB } from '../client'
import { useEffect, useState } from 'react'
import { getDB, initSQLite } from '../client'
import { runMigrations } from '../migrations'

export function useLocalDB() {
  const [db, setDb] = useState<SQLiteDB | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let mounted = true

    async function init() {
      try {
        const database = await initSQLite()
        await runMigrations(database)

        if (mounted) {
          setDb(database)
          setIsInitialized(true)
        }
      }
      catch (err) {
        console.error('[SQLite] Initialization failed:', err)
        if (mounted) {
          setError(err as Error)
        }
      }
    }

    init()

    return () => {
      mounted = false
    }
  }, [])

  return { db, isInitialized, error }
}

export async function ensureDB(): Promise<SQLiteDB> {
  const db = await getDB()
  return db
}
