'use client'

import type { TodoItem } from '../../model/types'
import { Button, Input } from '@synapse/ui/components'
import { Plus, X } from 'lucide-react'
import { useState } from 'react'

interface TodoListProps {
  items: TodoItem[]
  isLoading: boolean
  onAddTodo: (text: string) => void
  onRemoveTodo: (index: number) => void
  onToggleTodo: (index: number) => void
  onUpdateTodoText: (index: number, text: string) => void
}

export function TodoList({
  items,
  isLoading,
  onAddTodo,
  onRemoveTodo,
  onToggleTodo,
  onUpdateTodoText,
}: TodoListProps) {
  const [todoInput, setTodoInput] = useState('')

  const handleAddTodo = () => {
    const value = todoInput.trim()
    if (!value)
      return
    onAddTodo(value)
    setTodoInput('')
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Input
          placeholder="Add item..."
          value={todoInput}
          onChange={e => setTodoInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter')
              handleAddTodo()
          }}
          disabled={isLoading}
          className="flex-1"
        />
        <Button
          type="button"
          onClick={handleAddTodo}
          disabled={!todoInput.trim() || isLoading}
          size="sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        {items.length === 0 && (
          <div className="text-muted-foreground text-sm">There's no items</div>
        )}
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2 group">
            <Input
              type="checkbox"
              checked={item.marked}
              onChange={() => onToggleTodo(idx)}
              className="w-5 h-5 cursor-pointer"
              disabled={isLoading}
            />
            <Input
              value={item.text}
              onChange={e => onUpdateTodoText(idx, e.target.value)}
              className="flex-1 px-2 py-1"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => onRemoveTodo(idx)}
              disabled={isLoading}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4 text-destructive" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
