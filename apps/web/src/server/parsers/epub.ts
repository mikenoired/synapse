import type { ParsedDocument, ParserOptions } from './types'

export async function parseEPUB(buffer: Buffer, options: ParserOptions = {}): Promise<ParsedDocument> {
  try {
    // Динамический импорт для избежания проблем с SSR
    const { EPub } = await import('epub2')

    const epub = new EPub(buffer.toString('base64'))
    await epub.parse()

    let content = ''
    let title = epub.metadata?.title || 'EPUB Document'
    let thumbnailBase64: string | undefined

    // Извлекаем текст из всех глав
    const chapters = epub.flow || []
    for (const chapter of chapters) {
      try {
        const chapterContent = await epub.getChapter(chapter.id || '', (error: any, text?: string) => {
          if (error) {
            console.warn(`Failed to parse chapter ${chapter.id}:`, error)
            return
          }
          if (text) {
            // Удаляем HTML теги и извлекаем чистый текст
            const textContent = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
            content += textContent + '\n\n'
          }
        })
      } catch (error) {
        console.warn(`Failed to parse chapter ${chapter.id}:`, error)
      }
    }

    // Пытаемся извлечь обложку
    if (options.extractThumbnail) {
      try {
        // EPUB2 не имеет метода getCover, пропускаем извлечение обложки
        console.warn('Cover extraction not supported in current EPUB parser')
      } catch (error) {
        console.warn('Failed to extract cover image:', error)
      }
    }

    return {
      type: 'epub',
      title,
      content: content.trim(),
      thumbnailBase64,
    }
  } catch (error) {
    throw new Error(`Failed to parse EPUB: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
