import type { ClassValue } from 'clsx'
import { TRPCError } from '@trpc/server'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function numWord(value: number, words: string[]) {
  value = Math.abs(value) % 100
  const num = value % 10
  if (value > 10 && value < 20)
    return words[2]
  if (num > 1 && num < 5)
    return words[1]
  if (num === 1)
    return words[0]
  return words[2]
}

/**
 * Format size from bytes to human-readable format
 * @param bytes Size in bytes
 * @param options Configuration options
 * @param options.precision Number of decimal places (default: 1)
 * @param options.binary Use binary units (1024) vs decimal (1000) (default: true)
 * @param options.locale Locale for number formatting (default: 'en-US')
 * @returns Formatted size string
 */
export function formatSize(
  bytes: number,
  options: {
    precision?: number
    binary?: boolean
    locale?: string
  } = {},
): string {
  const { precision = 1, binary = true, locale = 'en-US' } = options

  if (bytes === 0)
    return '0 B'
  if (bytes < 0)
    return 'Invalid size'

  const base = binary ? 1024 : 1000
  const units = binary
    ? ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB']
    : ['B', 'KB', 'MB', 'GB', 'TB', 'PB']

  const unitIndex = Math.floor(Math.log(bytes) / Math.log(base))
  const clampedIndex = Math.min(unitIndex, units.length - 1)

  if (clampedIndex === 0) {
    return `${bytes} B`
  }

  const size = bytes / (base ** clampedIndex)
  const formattedSize = size.toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: precision,
  })

  return `${formattedSize} ${units[clampedIndex]}`
}

/**
 * Parse a human-readable size string back to bytes
 * @param sizeString Size string like "1.5 GB" or "512 MB"
 * @returns Size in bytes or null if invalid
 */
export function parseSize(sizeString: string): number | null {
  const match = sizeString.trim().match(/^(\d+(?:\.\d+)?)\s*([a-z]+)$/i)
  if (!match)
    return null

  const [, numberStr, unit] = match
  const number = Number.parseFloat(numberStr)

  if (Number.isNaN(number))
    return null

  const unitLower = unit.toLowerCase()
  const binaryUnits = {
    b: 1,
    kib: 1024,
    mib: 1024 ** 2,
    gib: 1024 ** 3,
    tib: 1024 ** 4,
    pib: 1024 ** 5,
  }

  const decimalUnits = {
    b: 1,
    kb: 1000,
    mb: 1000 ** 2,
    gb: 1000 ** 3,
    tb: 1000 ** 4,
    pb: 1000 ** 5,
  }

  const multiplier = binaryUnits[unitLower as keyof typeof binaryUnits]
    || decimalUnits[unitLower as keyof typeof decimalUnits]

  return multiplier ? Math.round(number * multiplier) : null
}

/**
 * Convert bytes to specific unit
 * @param bytes Size in bytes
 * @param targetUnit Target unit (e.g., 'MB', 'GiB')
 * @returns Size in target unit
 */
export function convertSize(bytes: number, targetUnit: string): number {
  const parsed = parseSize(`1 ${targetUnit}`)
  return parsed ? bytes / parsed : 0
}

export function handleSupabaseError(error: any, fallbackMessage = 'An error occurred'): never {
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: `${fallbackMessage}: ${error?.message}`,
  })
}

export function handleSupabaseNotFound(error: any, message = 'No content found'): never {
  throw new TRPCError({
    code: 'NOT_FOUND',
    message: `${message}: ${error?.message}`,
  })
}

export function handleAuthError(error: any, code: 'BAD_REQUEST' | 'UNAUTHORIZED' = 'BAD_REQUEST'): never {
  throw new TRPCError({
    code,
    message: `Authentication error: ${error?.message}`,
  })
}

export function handleConflictError(message: string): never {
  throw new TRPCError({
    code: 'CONFLICT',
    message,
  })
}
