'use client'

import { Button } from '@/shared/ui/button'
import { FileText, Image as ImageIcon, Link, ListChecks, Maximize, Minimize } from 'lucide-react'
import { Content } from '@/shared/lib/schemas'
import { cn } from '@/shared/lib/utils'

interface ContentTypeSelectorProps {
  type: Content['type']
  onTypeChange: (type: Content['type']) => void
  isFullScreen: boolean
  onToggleFullScreen: () => void
}

export function ContentTypeSelector({
  type,
  onTypeChange,
  isFullScreen,
  onToggleFullScreen
}: ContentTypeSelectorProps) {
  const contentTypes = [
    { key: 'note', icon: FileText, label: 'Заметка' },
    { key: 'media', icon: ImageIcon, label: 'Медиа' },
    { key: 'link', icon: Link, label: 'Ссылка' },
    { key: 'todo', icon: ListChecks, label: 'Список' },
  ] as const

  return (
    <div className="p-4 border-b flex flex-row items-center justify-between">
      <div className="flex items-center">
        {contentTypes.map(({ key, icon: Icon, label }) => (
          <Button
            key={key}
            type="button"
            variant={type === key ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onTypeChange(key)}
            className={cn(
              "flex items-center gap-2 bg-none",
              type === key && "bg-muted"
            )}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
          </Button>
        ))}
      </div>
      {type === 'note' && (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleFullScreen}
            className="text-muted-foreground hover:text-foreground"
          >
            {isFullScreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </Button>
        </div>
      )}
    </div>
  )
}
