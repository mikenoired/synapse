'use client'

import { X } from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import { Input } from '@/shared/ui/input'
import { useAddContent } from '../model/add-content-context'
import { TodoList } from './components/todo-list'

export default function AddTodoView() {
  const {
    formState: { title },
    updateTitle,
    isSubmitting,
    tags,
    currentTag,
    updateCurrentTag,
    handleTagKeyDown,
    todoItems,
    removeTag,
    addTodo,
    removeTodo,
    toggleTodo,
    updateTodoText,
  } = useAddContent()

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 pb-4 border-b">
        <div className="max-w-[700px] mx-auto w-full">
          <Input
            id="title"
            placeholder="Title (optional)..."
            value={title}
            onChange={e => updateTitle(e.target.value)}
            disabled={isSubmitting}
            className="!text-2xl font-bold border-none shadow-none !bg-transparent focus-visible:ring-0 h-auto px-0"
          />
          <div className="flex flex-wrap gap-2 mt-3">
            {tags.map(tag => (
              <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                  disabled={isSubmitting}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            <Input
              id="tags"
              placeholder="+ Add tag"
              value={currentTag}
              onChange={e => updateCurrentTag(e.target.value)}
              onKeyDown={handleTagKeyDown}
              className="border-none shadow-none focus-visible:ring-0 h-auto flex-1"
              disabled={isSubmitting}
            />
          </div>
        </div>
      </div>
      <div className="flex-1 p-6 pt-2 overflow-y-auto">
        <div className="max-w-[700px] mx-auto w-full">
          <TodoList
            items={todoItems}
            isLoading={isSubmitting}
            onAddTodo={addTodo}
            onRemoveTodo={removeTodo}
            onToggleTodo={toggleTodo}
            onUpdateTodoText={updateTodoText}
          />
        </div>
      </div>
    </div>
  )
}
