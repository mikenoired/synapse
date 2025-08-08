import AiTab from '@/features/settings-ai/ui/ai-tab';
import GeneralTab from '@/features/settings-general/ui/general-tab';
import MediaTab from '@/features/settings-media/ui/media-tab';
import ThemingTab from '@/features/settings-theming/ui/theming-tab';
import SettingsSidebar from '@/widgets/settings/ui/settings-sidebar';
import { notFound } from 'next/navigation';
import { Suspense, use } from 'react';
import type { ReactElement } from 'react';

export default function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = use(searchParams);

  const tabComponents: Record<string, ReactElement> = {
    general: <GeneralTab />,
    media: <MediaTab />,
    ai: <AiTab />,
    theming: <ThemingTab />,
  };

  const resolvedTab = tab || 'general';
  const content = tabComponents[resolvedTab];

  if (!content) {
    notFound();
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full bg-background">
      <SettingsSidebar activeTab={resolvedTab} />
      <main className="flex-1 p-4 md:p-8 max-w-3xl mx-auto w-full">
        <Suspense fallback={<div className="animate-pulse h-32" />}>{content}</Suspense>
      </main>
    </div>
  );
}