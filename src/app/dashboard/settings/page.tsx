import type { ReactElement } from 'react'
import { notFound } from 'next/navigation'
import AiTab from '@/features/settings-ai/ui/ai-tab'
import GeneralTab from '@/features/settings-general/ui/general-tab'
import MediaTab from '@/features/settings-media/ui/media-tab'
import ThemingTab from '@/features/settings-theming/ui/theming-tab'
import { createContext } from '@/server/context'
import SettingsSidebar from '@/widgets/settings/ui/settings-sidebar'

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams

  const ctx = await createContext({})
  if (!ctx.user)
    return null

  const tabComponents: Record<string, ReactElement> = {
    general: <GeneralTab />,
    media: <MediaTab />,
    ai: <AiTab />,
    theming: <ThemingTab />,
  }

  const resolvedTab = tab || 'general'
  const content = tabComponents[resolvedTab]

  if (!content)
    notFound()

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full bg-background">
      <SettingsSidebar activeTab={resolvedTab} />
      <main className="flex-1 p-4 md:p-8 max-w-3xl mx-auto w-full">
        {content}
      </main>
    </div>
  )
}
