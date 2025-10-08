'use client'

import type { Content } from '@/shared/lib/schemas'
import { FileText, Image as ImageIcon, Link, ListChecks, Maximize, Minimize, Music2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
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
  onToggleFullScreen,
}: ContentTypeSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const activeTabElementRef = useRef<HTMLButtonElement>(null)

  const contentTypes = [
    { key: 'note', icon: FileText, label: 'Заметка' },
    { key: 'media', icon: ImageIcon, label: 'Медиа' },
    { key: 'audio', icon: Music2, label: 'Аудио' },
    { key: 'link', icon: Link, label: 'Ссылка' },
    { key: 'todo', icon: ListChecks, label: 'Список' },
  ] as const

  useEffect(() => {
    const container = containerRef.current

    if (type && container) {
      const activeTabElement = activeTabElementRef.current

      if (activeTabElement) {
        const { offsetLeft, offsetWidth } = activeTabElement

        const clipLeft = offsetLeft
        const clipRight = offsetLeft + offsetWidth

        container.style.clipPath = `inset(0 ${Number(100 - (clipRight / container.offsetWidth) * 100).toFixed(2)}% 0 ${Number((clipLeft / container.offsetWidth) * 100).toFixed(2)}% round 8px)`
      }
    }
  }, [type])

  return (
    <div className="p-4 border-b flex flex-row items-center justify-between">
      <div className="relative flex items-center">
        <div className="flex items-center">
          {contentTypes.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              ref={type === key ? activeTabElementRef : null}
              type="button"
              onClick={() => onTypeChange(key)}
              className={cn(
                'flex items-center transition-colors duration-200',
                'hover:bg-muted/50 gap-1 rounded-lg px-3 overflow-auto py-2',
                type === key && 'text-primary',
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>

        <div
          aria-hidden
          className="clip-path-container absolute inset-0 flex items-center pointer-events-none"
          ref={containerRef}
          style={{
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
          }}
        >
          {contentTypes.map(({ key, icon: Icon, label }) => (
            <div key={key} className="flex items-center">
              <button
                onClick={() => onTypeChange(key)}
                className={cn(
                  'button flex items-center px-3 py-2',
                  'bg-primary gap-1 text-primary-foreground',
                  'transition-colors duration-200',
                )}
                tabIndex={-1}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline text-sm font-medium">{label}</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {type === 'note' && (
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleFullScreen}
            className="text-muted-foreground hover:text-foreground"
          >
            {isFullScreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      )}
    </div>
  )
}
