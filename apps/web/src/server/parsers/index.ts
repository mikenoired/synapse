import { parsePDF } from './pdf'
import { parseDOCX } from './docx'
import { parseEPUB } from './epub'
import { parseXLSX } from './xlsx'
import { parseCSV } from './csv'
import type { ParsedDocument, ParserOptions } from './types'

export type SupportedFileType = 'pdf' | 'docx' | 'epub' | 'xlsx' | 'csv'

export interface FileInfo {
  name: string
  type: string
  size: number
  buffer: Buffer
}

export async function parseFile(file: FileInfo, options: ParserOptions = {}): Promise<ParsedDocument> {
  const fileType = getFileType(file.name, file.type)

  switch (fileType) {
    case 'pdf':
      return await parsePDF(file.buffer, options)
    case 'docx':
      return await parseDOCX(file.buffer, options)
    case 'epub':
      return await parseEPUB(file.buffer, options)
    case 'xlsx':
      return await parseXLSX(file.buffer, options)
    case 'csv':
      return await parseCSV(file.buffer, options)
    default:
      throw new Error(`Unsupported file type: ${fileType}`)
  }
}

export function getFileType(filename: string, mimeType?: string): SupportedFileType | null {
  const extension = filename.toLowerCase().split('.').pop()

  // Проверяем по MIME типу
  if (mimeType) {
    const mimeTypeMap: Record<string, SupportedFileType> = {
      'application/pdf': 'pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/epub+zip': 'epub',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'application/vnd.ms-excel': 'xlsx',
      'text/csv': 'csv',
    }

    if (mimeTypeMap[mimeType]) {
      return mimeTypeMap[mimeType]
    }
  }

  // Проверяем по расширению файла
  const extensionMap: Record<string, SupportedFileType> = {
    'pdf': 'pdf',
    'docx': 'docx',
    'epub': 'epub',
    'xlsx': 'xlsx',
    'xls': 'xlsx',
    'csv': 'csv',
  }

  return extension ? extensionMap[extension] || null : null
}

export function isSupportedFileType(filename: string, mimeType?: string): boolean {
  return getFileType(filename, mimeType) !== null
}

export function getSupportedExtensions(): string[] {
  return ['pdf', 'docx', 'epub', 'xlsx', 'xls', 'csv']
}

export function getSupportedMimeTypes(): string[] {
  return [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/epub+zip',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
  ]
}
