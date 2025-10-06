'use client'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/shared/ui/button'

const tabs = [
  { key: 'general', label: 'General' },
  { key: 'media', label: 'Media' },
  { key: 'ai', label: 'AI' },
  { key: 'theming', label: 'Theming' },
]

export default function SettingsSidebar({ activeTab }: { activeTab?: string }) {
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab') || activeTab || 'general'

  return (
    <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-border bg-background flex md:flex-col flex-row md:h-auto h-14 md:min-h-screen">
      <div className="flex md:flex-col flex-row w-full h-full">
        {tabs.map(tabItem => (
          <Link
            key={tabItem.key}
            href={`/dashboard/settings?tab=${tabItem.key}`}
            scroll={false}
            className="flex-1 md:flex-none"
          >
            <Button
              variant={tab === tabItem.key ? 'default' : 'ghost'}
              className="w-full cursor-pointer md:justify-start justify-center md:px-6 px-2 py-6 rounded-none md:rounded-l-lg text-base md:text-lg font-medium transition"
            >
              {tabItem.label}
            </Button>
          </Link>
        ))}
      </div>
    </aside>
  )
}
