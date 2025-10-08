'use client'

import { X } from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

interface TagInputProps {
  tags: string[]
  currentTag: string
  isLoading: boolean
  onCurrentTagChange: (tag: string) => void
  onAddTag: () => void
  onRemoveTag: (tag: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

export function TagInput({
  tags,
  currentTag,
  isLoading,
  onCurrentTagChange,
  onAddTag,
  onRemoveTag,
  onKeyDown,
}: TagInputProps) {
  return (
    <div className="space-y-3">
      <Label htmlFor="tags">Tags</Label>
      <div className="flex gap-2">
        <Input
          id="tags"
          placeholder="Add tag..."
          value={currentTag}
          onChange={e => onCurrentTagChange(e.target.value)}
          onKeyDown={onKeyDown}
          className="flex-1"
          disabled={isLoading}
        />
        <Button
          type="button"
          onClick={onAddTag}
          disabled={!currentTag.trim() || isLoading}
          size="sm"
        >
          Add
        </Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map(tag => (
            <Badge key={tag} variant="secondary" className="flex items-center gap-1">
              {tag}
              <button
                type="button"
                onClick={() => onRemoveTag(tag)}
                className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                disabled={isLoading}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
