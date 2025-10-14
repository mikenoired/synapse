import type { ParsedDocument, ParserOptions } from './types'

export async function parseXLSX(buffer: Buffer, options: ParserOptions = {}): Promise<ParsedDocument> {
  try {
    // Динамический импорт для избежания проблем с SSR
    const XLSX = await import('xlsx')

    const workbook = XLSX.read(buffer, { type: 'buffer' })

    let content = ''
    let title = workbook.Props?.Title || 'XLSX Document'

    // Извлекаем данные из всех листов
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

      content += `Лист: ${sheetName}\n`

      // Преобразуем данные в читаемый текст
      for (const row of jsonData as any[][]) {
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
      content += '\n'
    }

    return {
      type: 'xlsx',
      title,
      content: content.trim(),
      thumbnailBase64: undefined, // XLSX не поддерживает миниатюры
    }
  } catch (error) {
    throw new Error(`Failed to parse XLSX: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
