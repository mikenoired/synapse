import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '@/shared/lib/auth-context'
import type { LinkState } from './types'

export function useLinkParser() {
  const { session } = useAuth()
  const [state, setState] = useState<LinkState>({
    parsedData: null,
    isLoading: false,
  })

  const parseLink = useCallback(async (url: string) => {
    if (!url || !url.trim()) return

    try {
      setState(prev => ({ ...prev, isLoading: true }))

      const response = await fetch('/api/parse-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ url: url.trim() }),
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'Failed to parse link')
        return
      }

      if (result.success && result.data) {
        setState(prev => ({ ...prev, parsedData: result.data }))
        toast.success('Link parsed successfully!')
        return result.data
      }
    } catch (error) {
      console.error('Error parsing link:', error)
      toast.error('Failed to parse the link')
    } finally {
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [session?.access_token])

  const clearParsedData = useCallback(() => {
    setState(prev => ({ ...prev, parsedData: null }))
  }, [])

  const resetLink = useCallback(() => {
    setState({
      parsedData: null,
      isLoading: false,
    })
  }, [])

  return {
    parsedData: state.parsedData,
    isLoading: state.isLoading,
    parseLink,
    clearParsedData,
    resetLink,
  }
}
