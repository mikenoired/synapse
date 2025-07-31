import { TRPCError } from '@trpc/server'
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
