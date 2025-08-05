'use client';

import Item from '@/entities/item/ui/item';
import { Content } from '@/shared/lib/schemas';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import { Session } from '@supabase/supabase-js';
import { FileText, Search } from 'lucide-react';
import { useEffect, useRef } from 'react';
import Masonry from 'react-masonry-css';

interface ContentGridProps {
  items: Content[];
  isLoading: boolean;
  fetchNext?: () => void;
  hasNext?: boolean;
  isFetchingNext?: boolean;
  session: Session | null;
  onContentChanged: () => void;
  onItemClick: (item: Content) => void;
  onItemHover?: () => void;
  searchQuery?: string;
  selectedTags?: string[];
  onClearFilters?: () => void;
  excludedTag?: string;
}

const breakpointColumnsObj = {
  default: 4,
  2560: 5,
  1920: 4,
  1280: 3,
  1024: 2,
  768: 2,
  640: 1
};

export function ContentGrid({
  items,
  isLoading,
  fetchNext,
  hasNext,
  session,
  onContentChanged,
  onItemClick,
  onItemHover,
  searchQuery,
  selectedTags,
  onClearFilters,
  excludedTag,
}: ContentGridProps) {

  const hasContent = items.length > 0;
  const showEmptyState = !isLoading && !hasContent && !searchQuery && (!selectedTags || selectedTags.length === 0);
  const showNotFoundState = !isLoading && !hasContent && (searchQuery || (selectedTags && selectedTags.length > 0));

  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!fetchNext || !hasNext) return
    const observer = new IntersectionObserver(entries => {
      const first = entries[0]
      if (first.isIntersecting) {
        fetchNext()
      }
    })
    const current = sentinelRef.current
    if (current) observer.observe(current)
    return () => {
      if (current) observer.unobserve(current)
    }
  }, [fetchNext, hasNext])

  if (isLoading) {
    return (
      <Masonry
        breakpointCols={breakpointColumnsObj}
        className="masonry-grid"
        columnClassName="masonry-grid_column"
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <div className="mb-4 bg-transparent" key={i}>
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
        ))}
      </Masonry>
    );
  }

  if (showEmptyState) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-12">
        <Card className="w-full max-w-md p-8">
          <CardContent className="space-y-4">
            <FileText className="w-16 h-16 mx-auto text-muted-foreground opacity-50" />
            <div>
              <h3 className="text-xl font-semibold mb-2">Ваш мозг пока пуст</h3>
              <p className="text-muted-foreground mb-6">
                Начните с добавления заметки, файла или ссылки.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showNotFoundState) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground">
          <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">Ничего не найдено</p>
          <p className="text-sm">Попробуйте изменить параметры поиска</p>
          {onClearFilters && (
            <Button
              variant="outline"
              onClick={onClearFilters}
              className="mt-4"
            >
              Сбросить фильтры
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Masonry
      breakpointCols={breakpointColumnsObj}
      className="masonry-grid"
      columnClassName="masonry-grid_column"
    >
      {items.map((item, index) => (
        <div
          key={item.id}
          className="animate-in fade-in-0 duration-300"
          onMouseEnter={onItemHover}
        >
          <Item
            item={item}
            index={index}
            session={session}
            onContentChanged={onContentChanged}
            onItemClick={onItemClick}
            excludedTag={excludedTag}
          />
        </div>
      ))}
      {hasNext && <div ref={sentinelRef} className="h-10 w-full"></div>}
    </Masonry>
  )
}