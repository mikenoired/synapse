'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useDashboard } from '@/shared/lib/dashboard-context'

const placeholders = [
  'Where it was saved...',
  'How it was called...',
  'Maybe I will search by tags...',
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
    <div className="space-y-6 sticky top-0 bg-background z-10">
      <div className="relative">
        <input
          ref={searchInputRef}
          id="search"
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          autoFocus
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-background px-4 py-3 text-2xl border-b focus:outline-none"
        />
      </div>
    </div>
  )
}
