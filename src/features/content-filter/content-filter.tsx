'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useDashboard } from '@/shared/lib/dashboard-context'

const placeholders = [
  'Помню как-то называлось...',
  'Где-то я это уже сохранял...',
  'О чём это было...',
  'Точно помню, что это где-то тут...',
  'Вспомнить всё',
  'Может, по тегу найдётся...',
]

interface ContentFilterProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
}

export function ContentFilter({ searchQuery, setSearchQuery }: ContentFilterProps) {
  const searchInputRef = useRef<HTMLInputElement>(null)
  const { setTriggerSearchFocus } = useDashboard()

  useEffect(() => {
    if (searchInputRef.current)
      setTriggerSearchFocus(() => searchInputRef.current?.focus)
  }, [setTriggerSearchFocus])

  const placeholder = useMemo(() => {
    return placeholders[Math.floor(Math.random() * placeholders.length)]
  }, [])

  return (
    <div className="space-y-6 mb-6">
      <div className="relative">
        <input
          ref={searchInputRef}
          id="search"
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-background pr-4 py-3 text-2xl border-b focus:outline-none"
        />
      </div>
    </div>
  )
}
