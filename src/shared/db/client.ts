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
        // eslint-disable-next-line no-console
        console.log('[SQLite] Using OPFS for persistence')
        const opfs = await (sqlite3 as any).opfs.OpfsDb.create('/synapse.db')
        db = opfs
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
