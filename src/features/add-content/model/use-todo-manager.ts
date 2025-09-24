import type { TodoState } from './types'
import { useCallback, useState } from 'react'

export function useTodoManager() {
  const [state, setState] = useState<TodoState>({
    items: [],
  })

  const addTodo = useCallback((text: string) => {
    const trimmedText = text.trim()
    if (trimmedText) {
      setState(prev => ({
        items: [...prev.items, { text: trimmedText, marked: false }],
      }))
    }
  }, [])

  const removeTodo = useCallback((index: number) => {
    setState(prev => ({
      items: prev.items.filter((_, i) => i !== index),
    }))
  }, [])

  const toggleTodo = useCallback((index: number) => {
    setState(prev => ({
      items: prev.items.map((item, i) =>
        i === index ? { ...item, marked: !item.marked } : item,
      ),
    }))
  }, [])

  const updateTodoText = useCallback((index: number, text: string) => {
    setState(prev => ({
      items: prev.items.map((item, i) =>
        i === index ? { ...item, text } : item,
      ),
    }))
  }, [])

  const resetTodos = useCallback(() => {
    setState({ items: [] })
  }, [])

  const hasValidTodos = state.items.length > 0 && state.items.every(item => item.text.trim())

  return {
    items: state.items,
    addTodo,
    removeTodo,
    toggleTodo,
    updateTodoText,
    resetTodos,
    hasValidTodos,
  }
}
