'use client'

import { Badge, Input } from '@synapse/ui/components'
import { X } from 'lucide-react'
import { Editor } from '@/widgets/editor/ui/editor'
import { useAddContent } from '../model/add-content-context'

export default function AddNoteView() {
  const {
    formState: { title },
    updateTitle,
    isSubmitting,
    tags,
    currentTag,
    updateCurrentTag,
    handleTagKeyDown,
    editorData,
    setEditorData,
    removeTag,
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
          <Editor
            data={editorData}
            onChange={setEditorData}
            readOnly={isSubmitting}
          />
        </div>
      </div>
    </div>
  )
}
