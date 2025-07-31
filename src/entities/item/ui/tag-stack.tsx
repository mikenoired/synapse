'use client';

import { getSecureImageUrl } from '@/shared/lib/image-utils';
import { Content } from '@/shared/lib/schemas';
import { cn } from '@/shared/lib/utils';
import { Card, CardContent } from '@/shared/ui/card';
import { Session } from '@supabase/supabase-js';
import { FileText, LinkIcon } from 'lucide-react';

interface TagStackProps {
  items: Content[];
  session: Session | null;
}

function getItemComponent(item: Content, session: Session | null) {
  if (item.type === 'image' && item.image_url) {
    return <img
      src={getSecureImageUrl(item.image_url.replace('/api/files/', ''), session?.access_token)}
      alt={item.title || 'Image'}
      className="object-cover"
      onError={(e) => {
        e.currentTarget.src = '/images/default-image.png';
        e.currentTarget.className = 'object-cover';
      }}
    />
  }
  if (item.type === 'note' && item.title) {
    return (
      <div className="p-4">
        <h3 className="font-semibold mb-2 line-clamp-2">{item.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-3">
          {/* Basic parsing to avoid full editorjs overhead */}
          {JSON.parse(item.content as string)?.blocks[0]?.data.text || ''}
        </p>
      </div>
    );
  }
  if (item.type === 'link' && item.url) {
    return (
      <div className="p-4 flex flex-col justify-center items-center h-full text-center">
        <LinkIcon className="size-8 mb-2 text-muted-foreground" />
        <p className="text-sm font-medium line-clamp-2">{item.title || item.url}</p>
        <p className="text-xs text-muted-foreground mt-1 truncate max-w-full">{item.url}</p>
      </div>
    )
  }
  return (
    <div className="p-4 flex flex-col justify-center items-center h-full">
      <FileText className="size-8 text-muted-foreground" />
      <p className="mt-2 text-sm">Контент</p>
    </div>
  );
}

export function TagStack({ items, session }: TagStackProps) {
  if (!items || items.length === 0) {
    return (
      <Card className="h-48 flex items-center justify-center text-muted-foreground">
        Нет элементов
      </Card>
    );
  }

  return (
    <div className="relative h-48 w-full cursor-pointer">
      {items.slice(0, 3).reverse().map((item, index) => (
        <Card
          key={item.id}
          className={cn(
            "absolute w-full h-full overflow-hidden transition-all duration-300 ease-in-out group-hover:shadow-xl p-0",
            index === 0 && "z-30",
            index === 1 && "z-20 rotate-0 translate-x-1.5 -translate-y-3 group-hover:rotate-3 group-hover:translate-x-4 group-hover:-translate-y-4",
            index === 2 && "z-10 -rotate-2 -translate-x-1.5 translate-y-3 group-hover:-translate-x-4 group-hover:translate-y-4 group-hover:-rotate-3"
          )}
        >
          <CardContent className="p-0 h-full">
            {getItemComponent(item, session)}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}