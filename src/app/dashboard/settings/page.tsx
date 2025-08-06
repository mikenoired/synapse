import AiTab from '@/features/settings-ai/ui/ai-tab';
import GeneralTab from '@/features/settings-general/ui/general-tab';
import MediaTab from '@/features/settings-media/ui/media-tab';
import ThemingTab from '@/features/settings-theming/ui/theming-tab';
import SettingsSidebar from '@/widgets/settings/ui/settings-sidebar';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

export default function SettingsPage({ searchParams }: { searchParams?: { tab?: string } }) {
  const tab = searchParams?.tab || 'general';

  let content;
  switch (tab) {
    case 'general':
      content = <GeneralTab />;
      break;
    case 'media':
      content = <MediaTab />;
      break;
    case 'ai':
      content = <AiTab />;
      break;
    case 'theming':
      content = <ThemingTab />;
      break;
    default:
      notFound();
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full bg-background">
      <SettingsSidebar activeTab={tab} />
      <main className="flex-1 p-4 md:p-8 max-w-3xl mx-auto w-full">
        <Suspense fallback={<div className="animate-pulse h-32" />}>{content}</Suspense>
      </main>
    </div>
  );
}