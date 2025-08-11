'use client';

import { getPresignedMediaUrl } from '@/shared/lib/image-utils';
import { Content } from '@/shared/lib/schemas';
import { cn } from '@/shared/lib/utils';
import { Card, CardContent } from '@/shared/ui/card';
import { Session } from '@supabase/supabase-js';
import { FileText, LinkIcon } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';

interface TagStackProps {
  items: Content[];
  session: Session | null;
}

function TagPreview({ item, session }: { item: Content; session: Session | null }) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setErrored(false);
    setImgSrc(null);
    setLoaded(false);
    if (item.type === 'media' && item.media_url) {
      getPresignedMediaUrl(item.media_url, session?.access_token)
        .then((url) => {
          if (!cancelled) setImgSrc(url || null);
        })
        .catch(() => {
          if (!cancelled) setImgSrc(null);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [item.type, item.media_url, session?.access_token]);

  if (item.type === 'media' && item.media_url) {
    const blurThumb = item.thumbnail_base64 || '';

    return (
      <div className="relative w-full h-full">
        {blurThumb && !loaded && !errored && (
          <Image
            src={blurThumb}
            alt="blur preview"
            className="absolute inset-0 w-full h-full object-cover blur-lg scale-105 transition-opacity duration-300 z-0"
            style={{ opacity: loaded ? 0 : 1 }}
            draggable={false}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
          />
        )}
        {imgSrc && !errored ? (
          <Image
            src={imgSrc}
            alt={item.title || 'Image'}
            className="object-cover relative z-10 transition-opacity duration-300"
            style={{ opacity: loaded ? 1 : 0 }}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            onLoad={() => setLoaded(true)}
            onError={() => { setErrored(true); setLoaded(true); }}
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full bg-muted">
            <FileText className="size-8 text-muted-foreground" />
          </div>
        )}
        {(!imgSrc || errored) && !blurThumb && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <FileText className="w-8 h-8 opacity-60" />
          </div>
        )}
      </div>
    );
  }

  if (item.type === 'note' && item.title) {
    let preview = '';
    try {
      preview = (JSON.parse(item.content as string)?.blocks?.[0]?.data?.text as string) || '';
    } catch {
      preview = '';
    }
    return (
      <div className="p-4">
        <h3 className="font-semibold mb-2 line-clamp-2">{item.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-3">{preview}</p>
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
    );
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
      <Card className="aspect-square flex items-center justify-center text-muted-foreground">
        Нет элементов
      </Card>
    );
  }

  return (
    <div className="relative aspect-square w-full cursor-pointer">
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
            <TagPreview item={item} session={session} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}