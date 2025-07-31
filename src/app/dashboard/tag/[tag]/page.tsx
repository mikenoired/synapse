'use client';

import { ContentModalManager } from '@/components/modals/content-modal-manager';
import { ContentGrid } from '@/features/content-grid/ui/content-grid';
import { useAuth } from '@/lib/auth-context';
import { Content } from '@/lib/schemas';
import { trpc } from '@/lib/trpc';
import { Tag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { use, useEffect, useState } from 'react';

interface TagPageProps {
  params: Promise<{
    tag: string;
  }>;
}

export default function TagPage({ params }: TagPageProps) {
  const resolvedParams = use(params);
  const decodedTag = decodeURIComponent(resolvedParams.tag);
  const [selectedItem, setSelectedItem] = useState<Content | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { user, loading, session } = useAuth();
  const router = useRouter();

  const {
    data: content = [],
    isLoading: contentLoading,
    refetch: refetchContent,
  } = trpc.content.getAll.useQuery({
    tags: [decodedTag],
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const handleContentChanged = () => refetchContent();

  const handleItemClick = (item: Content) => {
    setSelectedItem(item);
    setModalOpen(true);
  };

  const handleModalDelete = (id: string) => {
    trpc.content.delete.useMutation().mutate({ id }, {
      onSuccess: () => {
        handleContentChanged();
        setModalOpen(false);
      },
    });
  };

  if (loading || !user) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-2 px-6 py-4">
        <Tag className="size-6 text-muted-foreground" />
        <h1 className="text-2xl font-semibold capitalize">{decodedTag}</h1>
      </header>
      <main className="flex-1 overflow-y-auto p-6">
        <ContentGrid
          items={content}
          isLoading={contentLoading}
          session={session}
          onContentChanged={handleContentChanged}
          onItemClick={handleItemClick}
          excludedTag={decodedTag}
        />
      </main>

      <ContentModalManager
        open={modalOpen}
        onOpenChange={setModalOpen}
        item={selectedItem}
        allItems={content}
        session={session}
        onEdit={(id: string) => {
          router.push(`/edit/${id}`);
          setModalOpen(false);
        }}
        onDelete={handleModalDelete}
        onContentChanged={handleContentChanged}
      />
    </div>
  );
} 