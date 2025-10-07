import { getDB } from './client'

interface BackupData {
  timestamp: number
  tables: Record<string, any[]>
  version: number
}

const BACKUP_KEY = 'synapse_db_backup'
const BACKUP_VERSION = 1

/**
 * Создает резервную копию критически важных данных из SQLite в localStorage
 * Используется как механизм восстановления при сбоях OPFS
 */
export async function createBackup(): Promise<void> {
  try {
    const db = await getDB()
    const backup: BackupData = {
      timestamp: Date.now(),
      tables: {},
      version: BACKUP_VERSION,
    }

    // Получаем список таблиц
    const tables = db.selectObjects(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
    )

    // Для каждой таблицы сохраняем данные
    // Ограничиваем количество записей для экономии места
    for (const table of tables) {
      const tableName = table.name
      
      // Пропускаем большие таблицы и временные данные
      if (tableName === 'content_fts') continue
      
      // Для контента сохраняем только метаданные
      if (tableName === 'content') {
        backup.tables[tableName] = db.selectObjects(
          `SELECT id, type, title, created_at, updated_at, user_id FROM ${tableName} LIMIT 100`
        )
      } else {
        backup.tables[tableName] = db.selectObjects(
          `SELECT * FROM ${tableName} LIMIT 500`
        )
      }
    }

    // Сохраняем в localStorage
    localStorage.setItem(BACKUP_KEY, JSON.stringify(backup))
    console.warn(`[Backup] Created backup at ${new Date(backup.timestamp).toISOString()}`)
  } catch (error) {
    console.error('[Backup] Failed to create backup:', error)
  }
}

/**
 * Восстанавливает данные из резервной копии в SQLite
 */
export async function restoreFromBackup(): Promise<boolean> {
  try {
    const backupJson = localStorage.getItem(BACKUP_KEY)
    if (!backupJson) {
      console.warn('[Backup] No backup found')
      return false
    }

    const backup = JSON.parse(backupJson) as BackupData
    if (backup.version !== BACKUP_VERSION) {
      console.warn(`[Backup] Incompatible backup version: ${backup.version}`)
      return false
    }

    const db = await getDB()
    
    // Восстанавливаем данные для каждой таблицы
    for (const [tableName, rows] of Object.entries(backup.tables)) {
      if (!rows.length) continue
      
      // Проверяем существование таблицы
      const tableExists = db.selectValue(
        `SELECT count(*) FROM sqlite_master WHERE type='table' AND name=?`,
        [tableName]
      )
      
      if (!tableExists) {
        console.warn(`[Backup] Table ${tableName} doesn't exist, skipping`)
        continue
      }
      
      // Восстанавливаем данные транзакционно
      db.transaction(() => {
        for (const row of rows) {
          try {
            // Получаем колонки и значения
            const columns = Object.keys(row)
            const placeholders = columns.map(() => '?').join(', ')
            const values = columns.map(col => row[col])
            
            // Проверяем существование записи
            const idColumn = 'id' in row ? 'id' : columns[0]
            const idValue = row[idColumn]
            
            const exists = db.selectValue(
              `SELECT count(*) FROM ${tableName} WHERE ${idColumn} = ?`,
              [idValue]
            )
            
            if (exists) {
              // Обновляем существующую запись
              const setClause = columns
                .map(col => `${col} = ?`)
                .join(', ')
              
              db.run(
                `UPDATE ${tableName} SET ${setClause} WHERE ${idColumn} = ?`,
                [...values, idValue]
              )
            } else {
              // Вставляем новую запись
              db.run(
                `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`,
                values
              )
            }
          } catch (rowError) {
            console.error(`[Backup] Failed to restore row in ${tableName}:`, rowError)
          }
        }
      })
    }
    
    console.warn(`[Backup] Restored backup from ${new Date(backup.timestamp).toISOString()}`)
    return true
  } catch (error) {
    console.error('[Backup] Failed to restore from backup:', error)
    return false
  }
}

/**
 * Планирует регулярное создание резервных копий
 */
export function scheduleBackups(intervalMs = 5 * 60 * 1000): () => void {
  const intervalId = setInterval(createBackup, intervalMs)
  return () => clearInterval(intervalId)
}