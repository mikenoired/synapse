import type { ParsedDocument, ParserOptions } from './types'

export async function parseCSV(buffer: Buffer, options: ParserOptions = {}): Promise<ParsedDocument> {
  try {
    // Динамический импорт для избежания проблем с SSR
    const Papa = (await import('papaparse')).default

    const csvText = buffer.toString('utf-8')

    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        complete: (results: any) => {
          try {
            let content = ''
            let title = 'CSV Document'

            // Если есть ошибки парсинга, но есть данные
            if (results.errors.length > 0 && results.data.length === 0) {
              reject(new Error(`CSV parsing errors: ${results.errors.map((e: any) => e.message).join(', ')}`))
              return
            }

            // Преобразуем данные в читаемый текст
            for (const row of results.data as any[][]) {
              if (row && row.length > 0) {
                const rowText = row
                  .filter(cell => cell !== null && cell !== undefined && cell !== '')
                  .map(cell => String(cell))
                  .join(' | ')

                if (rowText.trim()) {
                  content += rowText + '\n'
                }
              }
            }

            // Пытаемся извлечь заголовок из первой строки
            if (results.data.length > 0) {
              const firstRow = results.data[0] as any[]
              if (firstRow && firstRow.length > 0) {
                const firstCell = String(firstRow[0]).trim()
                if (firstCell && firstCell.length < 100) {
                  title = firstCell
                }
              }
            }

            resolve({
              type: 'csv',
              title,
              content: content.trim(),
              thumbnailBase64: undefined, // CSV не поддерживает миниатюры
            })
          } catch (error) {
            reject(new Error(`Failed to process CSV data: ${error instanceof Error ? error.message : 'Unknown error'}`))
          }
        },
        error: (error: any) => {
          reject(new Error(`CSV parsing failed: ${error.message}`))
        },
        skipEmptyLines: true,
      })
    })
  } catch (error) {
    throw new Error(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
