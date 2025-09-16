import { useState, useCallback } from 'react'
import type { TagState } from './types'
import type { KeyboardEvent } from 'react'

export function useTagManager(initialTags: string[] = []) {
  const [state, setState] = useState<TagState>({
    tags: initialTags,
    currentTag: '',
  })

  const updateCurrentTag = useCallback((tag: string) => {
    setState(prev => ({ ...prev, currentTag: tag }))
  }, [])

  const addTag = useCallback(() => {
    const trimmedTag = state.currentTag.trim()
    if (trimmedTag && !state.tags.includes(trimmedTag)) {
      setState(prev => ({
        tags: [...prev.tags, trimmedTag],
        currentTag: '',
      }))
    }
  }, [state.currentTag, state.tags])

  const removeTag = useCallback((tagToRemove: string) => {
    setState(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }))
  }, [])

  const resetTags = useCallback(() => {
    setState({
      tags: initialTags,
      currentTag: '',
    })
  }, [initialTags])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      addTag()
    }
    if (e.key === 'Backspace' && state.currentTag === '') {
      e.preventDefault()
      removeTag(state.tags[state.tags.length - 1])
    }
  }, [addTag, removeTag, state.currentTag, state.tags])

  return {
    tags: state.tags,
    currentTag: state.currentTag,
    updateCurrentTag,
    addTag,
    removeTag,
    resetTags,
    handleKeyDown,
  }
}
