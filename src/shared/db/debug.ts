import { getDB } from './client'
import { resetDatabase } from './migrations'

export async function debugSQLite() {
  const db = await getDB()

  // List all tables
  const tables = db.selectObjects(
    `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`,
  )

  // List all indexes
  const indexes = db.selectObjects(
    `SELECT name, tbl_name FROM sqlite_master WHERE type='index' ORDER BY tbl_name`,
  )

  // Check operations
  let operationsCount = 0
  let unsyncedOpsCount = 0
  try {
    const ops = db.selectObjects('SELECT COUNT(*) as count FROM operations')
    operationsCount = ops[0]?.count || 0

    const unsyncedOps = db.selectObjects('SELECT COUNT(*) as count FROM operations WHERE synced = 0')
    unsyncedOpsCount = unsyncedOps[0]?.count || 0
  }
  catch (error) {
    console.error('Operations table not accessible:', error)
  }

  // Check content
  let contentCount = 0
  try {
    const content = db.selectObjects('SELECT COUNT(*) as count FROM content')
    contentCount = content[0]?.count || 0
  }
  catch (error) {
    console.error('Content table not accessible:', error)
  }

  // Check sync metadata
  let syncMetaCount = 0
  try {
    const syncMeta = db.selectObjects('SELECT COUNT(*) as count FROM sync_metadata')
    syncMetaCount = syncMeta[0]?.count || 0
  }
  catch (error) {
    console.error('Sync metadata table not accessible:', error)
  }

  return {
    tables: tables.map(t => t.name),
    indexes,
    operationsCount,
    unsyncedOpsCount,
    contentCount,
    syncMetaCount,
  }
}

export async function inspectTableData(tableName: string, limit: number = 10) {
  const db = await getDB()

  try {
    const data = db.selectObjects(`SELECT * FROM ${tableName} LIMIT ?`, [limit])
    return data
  }
  catch (error) {
    console.error(`Error reading ${tableName}:`, error)
    return null
  }
}

export async function getFullDatabaseInfo() {
  const db = await getDB()

  const info: any = {
    tables: {},
    summary: {},
  }

  // Get all table names
  const tables = db.selectObjects(
    `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`,
  )

  for (const table of tables) {
    const tableName = table.name

    try {
      // Get row count
      const countResult = db.selectObjects(`SELECT COUNT(*) as count FROM ${tableName}`)
      const rowCount = countResult[0]?.count || 0

      // Get sample data (first 5 rows)
      const sampleData = db.selectObjects(`SELECT * FROM ${tableName} LIMIT 5`)

      // Get table schema
      const schema = db.selectObjects(`PRAGMA table_info(${tableName})`)

      info.tables[tableName] = {
        rowCount,
        sampleData,
        schema,
      }

      info.summary[tableName] = rowCount
    }
    catch (error) {
      console.error(`Error reading table ${tableName}:`, error)
      info.tables[tableName] = { error: error instanceof Error ? error.message : String(error) }
    }
  }

  return info
}

export async function queryDatabase(sql: string, params: any[] = []) {
  const db = await getDB()

  try {
    const result = db.selectObjects(sql, params)
    return result
  }
  catch (error) {
    console.error('Query Error:', error)
    return null
  }
}

export async function inspectSyncOperations(limit: number = 10) {
  const db = await getDB()

  try {
    const operations = db.selectObjects(`
      SELECT 
        id,
        entity_type,
        entity_id,
        operation,
        data,
        version,
        timestamp,
        synced,
        user_id
      FROM operations 
      ORDER BY timestamp DESC 
      LIMIT ?
    `, [limit])

    return operations
  }
  catch (error) {
    console.error('Error reading operations:', error)
    return null
  }
}

export async function inspectUnsyncedOperations() {
  const db = await getDB()

  try {
    const operations = db.selectObjects(`
      SELECT 
        id,
        entity_type,
        entity_id,
        operation,
        data,
        version,
        timestamp,
        synced,
        user_id
      FROM operations 
      WHERE synced = 0
      ORDER BY timestamp DESC
    `)

    return operations
  }
  catch (error) {
    console.error('Error reading unsynced operations:', error)
    return null
  }
}

export async function resetLocalDB() {
  console.warn('Resetting local database...')
  const db = await getDB()
  await resetDatabase(db)
}

// Expose to window for browser console debugging
if (typeof window !== 'undefined') {
  (window as any).debugSQLite = debugSQLite;
  (window as any).resetLocalDB = resetLocalDB;
  (window as any).inspectTableData = inspectTableData;
  (window as any).getFullDatabaseInfo = getFullDatabaseInfo;
  (window as any).queryDatabase = queryDatabase;
  (window as any).inspectSyncOperations = inspectSyncOperations;
  (window as any).inspectUnsyncedOperations = inspectUnsyncedOperations
}
