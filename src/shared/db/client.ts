import sqlite3InitModule from '@sqlite.org/sqlite-wasm'

export interface SQLiteDB {
  exec: (sql: string, options?: { bind?: any[], returnValue?: 'resultRows' | 'saveSql' }) => any
  selectArrays: (sql: string, bind?: any[]) => any[][]
  selectObjects: (sql: string, bind?: any[]) => any[]
  selectValue: (sql: string, bind?: any[]) => any
  run: (sql: string, bind?: any[]) => void
  close: () => void
  transaction: <T>(fn: () => T) => T
}

let dbInstance: SQLiteDB | null = null
let initPromise: Promise<SQLiteDB> | null = null

export async function initSQLite(): Promise<SQLiteDB> {
  if (dbInstance) {
    return dbInstance
  }

  if (initPromise) {
    return initPromise
  }

  initPromise = (async () => {
    try {
      const sqlite3 = await sqlite3InitModule({
        // eslint-disable-next-line no-console
        print: console.log,
        printErr: console.error,
      })

      // Try to use OPFS (Origin Private File System) for persistence
      let db: any

      if ('opfs' in sqlite3 && sqlite3.opfs) {
        try {
          // eslint-disable-next-line no-console
          console.log('[SQLite] Using OPFS for persistence')
          const opfs = await (sqlite3 as any).opfs.OpfsDb.create('/synapse.db')
          db = opfs

          // Проверка целостности базы данных
          try {
            // Простой запрос для проверки работоспособности БД
            db.exec('SELECT 1')
            console.warn('[SQLite] OPFS database integrity check passed')
          }
          catch (integrityError) {
            console.error('[SQLite] OPFS database integrity check failed:', integrityError)
            throw new Error('Database integrity check failed')
          }
        }
        catch (opfsError) {
          console.error('[SQLite] Failed to initialize OPFS database:', opfsError)
          console.warn('[SQLite] Falling back to in-memory database')
          db = new sqlite3.oo1.DB('/synapse.db', 'ct')

          // Восстановление из резервной копии
          try {
            console.warn('[SQLite] Attempting to recover data from backup...')
            // Динамический импорт для избежания циклических зависимостей
            const { restoreFromBackup } = await import('./backup')
            const restored = await restoreFromBackup()
            if (restored) {
              console.warn('[SQLite] Successfully restored data from backup')
            }
            else {
              console.warn('[SQLite] No valid backup found for recovery')
            }
          }
          catch (recoveryError) {
            console.error('[SQLite] Recovery failed:', recoveryError)
          }
        }
      }
      else {
        console.warn('[SQLite] OPFS not available, using in-memory database')
        db = new sqlite3.oo1.DB('/synapse.db', 'ct')
      }

      // Create wrapper with consistent API
      const wrapper: SQLiteDB = {
        exec: (sql: string, options?: { bind?: any[], returnValue?: 'resultRows' | 'saveSql' }) => {
          return db.exec({
            sql,
            bind: options?.bind,
            returnValue: options?.returnValue || 'resultRows',
          })
        },

        selectArrays: (sql: string, bind?: any[]) => {
          const result = db.exec({
            sql,
            bind,
            returnValue: 'resultRows',
            rowMode: 'array',
          })
          return result || []
        },

        selectObjects: (sql: string, bind?: any[]) => {
          const result = db.exec({
            sql,
            bind,
            returnValue: 'resultRows',
            rowMode: 'object',
          })
          return result || []
        },

        selectValue: (sql: string, bind?: any[]) => {
          const rows = db.exec({
            sql,
            bind,
            returnValue: 'resultRows',
            rowMode: 'array',
          })
          return rows?.[0]?.[0]
        },

        run: (sql: string, bind?: any[]) => {
          db.exec({ sql, bind })
        },

        close: () => {
          db.close()
          dbInstance = null
          initPromise = null
        },

        transaction: <T>(fn: () => T): T => {
          db.exec('BEGIN TRANSACTION')
          try {
            const result = fn()
            db.exec('COMMIT')
            return result
          }
          catch (error) {
            db.exec('ROLLBACK')
            throw error
          }
        },
      }

      dbInstance = wrapper
      return wrapper
    }
    catch (error) {
      initPromise = null
      throw error
    }
  })()

  return initPromise
}

export async function getDB(): Promise<SQLiteDB> {
  if (!dbInstance) {
    return await initSQLite()
  }
  return dbInstance
}

export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close()
  }
}
