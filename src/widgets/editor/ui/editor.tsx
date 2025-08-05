'use client'

import { useEffect, useMemo, useRef } from 'react'

interface EditorProps {
  data?: any
  onChange?: (data: any) => void
  placeholder?: string
  readOnly?: boolean
}

export function Editor({ data, onChange, placeholder = 'Начните писать...', readOnly = false }: EditorProps) {
  const editorRef = useRef<any>(null); // This will hold the EditorJS instance
  const holderId = useMemo(() => `editorjs-${Math.random().toString(36).substring(2, 15)}`, []);

  useEffect(() => {
    let editor: any = null;
    let isMounted = true;

    const initializeEditor = async () => {
      if (typeof window === 'undefined') return;

      try {
        // Загружаем EditorJS ядро и плагины только при реальном использовании
        const [
          { default: EditorJS },
          { default: Header },
          { default: List },
          { default: Delimiter },
          { default: Quote },
          { default: Code }
        ] = await Promise.all([
          import('@editorjs/editorjs'),
          import('@editorjs/header'),
          import('@editorjs/list'),
          import('@editorjs/delimiter'),
          import('@editorjs/quote'),
          import('@editorjs/code')
        ]);

        if (!isMounted) return;

        editor = new EditorJS({
          holder: holderId,
          data: data || { blocks: [] },
          readOnly,
          placeholder,
          tools: {
            header: Header,
            list: List,
            delimiter: Delimiter,
            quote: Quote,
            code: Code
          } as any,
          async onChange(api) {
            if (onChange) {
              try {
                const savedData = await api.saver.save();
                onChange(savedData);
              } catch (error) {
                console.error('Editor save error:', error);
              }
            }
          },
        });

        editorRef.current = editor;
      } catch (error) {
        console.error('Failed to initialize editor:', error);
      }
    };

    // Небольшая задержка для улучшения initial load time
    const timeoutId = setTimeout(initializeEditor, 100);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      // On cleanup, check if the editor instance exists on the ref and destroy it
      if (editorRef.current && typeof editorRef.current.destroy === 'function') {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
    // Re-run the effect if readOnly or holderId changes.
    // Data/placeholder changes are handled inside the editor instance itself or don't require re-init.
  }, [holderId, readOnly, onChange, placeholder, data]);

  return (
    <div className="min-h-[300px]">
      <div id={holderId} />
    </div>
  )
}


// Утилита для конвертации EditorJS данных в обычный текст для превью
export function editorDataToText(data: any): string {
  if (!data || !data.blocks) return ''

  return data.blocks
    .map((block: any) => {
      switch (block.type) {
        case 'paragraph':
          return block.data?.text || ''
        case 'header':
          return block.data?.text || ''
        case 'list':
          if (Array.isArray(block.data?.items)) {
            return block.data.items
              .map((item: any) => {
                // Поддержка как старого формата (строки), так и нового (объекты)
                if (typeof item === 'string') {
                  return item
                } else if (item && typeof item === 'object' && item.content) {
                  return item.content
                }
                return ''
              })
              .filter(Boolean)
              .join(', ')
          }
          return ''
        case 'quote':
          const quoteText = block.data?.text || ''
          const caption = block.data?.caption || ''
          return caption ? `"${quoteText}" - ${caption}` : `"${quoteText}"`
        case 'code':
          return block.data?.code || ''
        case 'delimiter':
          return '* * *'
        default:
          return ''
      }
    })
    .filter(Boolean)
    .join(' ')
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .substring(0, 200) // Limit for preview
}

// Утилита для конвертации EditorJS данных в краткий текст для карточек
export function editorDataToShortText(data: any, maxLength: number = 150): string {
  if (!data || !data.blocks) return ''

  let text = ''
  let currentLength = 0

  for (const block of data.blocks) {
    if (currentLength >= maxLength) break

    let blockText = ''
    switch (block.type) {
      case 'paragraph':
        blockText = block.data?.text || ''
        break
      case 'header':
        blockText = block.data?.text || ''
        break
      case 'list':
        if (Array.isArray(block.data?.items)) {
          blockText = block.data.items
            .slice(0, 3) // Показываем только первые 3 элемента списка
            .map((item: any) => {
              if (typeof item === 'string') {
                return item
              } else if (item && typeof item === 'object' && item.content) {
                return item.content
              }
              return ''
            })
            .filter(Boolean)
            .join(', ')

          if (block.data.items.length > 3) {
            blockText += '...'
          }
        }
        break
      case 'quote':
        const quoteText = block.data?.text || ''
        blockText = `"${quoteText}"`
        break
      case 'code':
        blockText = `[код: ${(block.data?.code || '').substring(0, 30)}...]`
        break
      default:
        continue
    }

    // Удаляем HTML теги и обрезаем до нужной длины
    blockText = blockText.replace(/<[^>]*>/g, '')

    if (currentLength + blockText.length > maxLength) {
      blockText = blockText.substring(0, maxLength - currentLength - 3) + '...'
    }

    if (blockText) {
      text += (text ? ' ' : '') + blockText
      currentLength = text.length
    }
  }

  return text
} 