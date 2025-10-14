import type { ParsedDocument, ParserOptions } from './types'

export async function parsePDF(buffer: Buffer, options: ParserOptions = {}): Promise<ParsedDocument> {
  try {
    // Используем pdfjs-dist напрямую с отключенным worker
    const pdfjsLib = await import('pdfjs-dist')

    // Отключаем worker для серверной среды
    pdfjsLib.GlobalWorkerOptions.workerSrc = ''

    // Загружаем PDF документ
    const loadingTask = pdfjsLib.getDocument({
      data: buffer,
      useSystemFonts: true,
    })

    const pdf = await loadingTask.promise
    let content = ''

    // Извлекаем текст из всех страниц
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const textContent = await page.getTextContent()

      // Объединяем текст из всех элементов страницы
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')

      content += pageText + '\n\n'
    }

    const title = extractTitleFromContent(content) || 'PDF Document'

    return {
      type: 'pdf',
      title,
      content: content.trim(),
      thumbnailBase64: options.extractThumbnail ? await generatePDFThumbnail(buffer) : undefined,
    }
  } catch (error) {
    console.error('PDF parsing error:', error)
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

function extractTitleFromContent(content: string): string | null {
  // Попытка найти заголовок в первых строках
  const lines = content.split('\n').filter(line => line.trim().length > 0)

  if (lines.length === 0) return null

  // Ищем строку, которая выглядит как заголовок (короткая, без точек в конце)
  for (const line of lines.slice(0, 5)) {
    const trimmed = line.trim()
    if (trimmed.length > 3 && trimmed.length < 100 && !trimmed.endsWith('.')) {
      return trimmed
    }
  }

  return null
}

async function generatePDFThumbnail(buffer: Buffer): Promise<string | undefined> {
  try {
    // Для генерации миниатюры PDF можно использовать pdfjs-dist
    // Пока возвращаем undefined, так как это требует дополнительной настройки
    return undefined
  } catch (error) {
    console.warn('Failed to generate PDF thumbnail:', error)
    return undefined
  }
}
