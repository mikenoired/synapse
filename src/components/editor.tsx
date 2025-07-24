'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

interface EditorProps {
  data?: any
  onChange?: (data: any) => void
  placeholder?: string
  readOnly?: boolean
}

export function Editor({ data, onChange, placeholder = 'Начните писать...', readOnly = false }: EditorProps) {
  const editorRef = useRef<any>(null)
  const [isReady, setIsReady] = useState(false)
  const isInitializedRef = useRef(false)
  const dataRef = useRef(data)

  // Generate unique ID for this editor instance
  const editorId = useMemo(() => `editorjs-${Math.random().toString(36).substring(2, 15)}`, [])

  // Update data ref when data changes
  useEffect(() => {
    dataRef.current = data
  }, [data])

  const initEditor = useCallback(async () => {
    if (typeof window === 'undefined' || isInitializedRef.current) return

    const EditorJS = (await import('@editorjs/editorjs')).default
    const Header = (await import('@editorjs/header')).default
    const List = (await import('@editorjs/list')).default
    const Delimiter = (await import('@editorjs/delimiter')).default
    const Quote = (await import('@editorjs/quote')).default
    const Code = (await import('@editorjs/code')).default

    if (editorRef.current) {
      await editorRef.current.destroy()
    }

    editorRef.current = new EditorJS({
      holder: editorId,
      data: dataRef.current || {
        time: Date.now(),
        blocks: [],
        version: '2.30.8'
      },
      readOnly,
      placeholder,
      tools: {
        header: Header,
        list: List,
        delimiter: Delimiter,
        quote: Quote,
        code: Code
      } as any,
      onChange: async () => {
        if (onChange && editorRef.current) {
          try {
            const savedData = await editorRef.current.save()
            onChange(savedData)
          } catch (error) {
            console.error('Saving failed:', error)
          }
        }
      }
    })

    try {
      await editorRef.current.isReady
      setIsReady(true)
      isInitializedRef.current = true
    } catch (error) {
      console.error('Editor failed to initialize:', error)
    }
  }, [editorId, readOnly, placeholder, onChange])

  useEffect(() => {
    initEditor()

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy()
        editorRef.current = null
        isInitializedRef.current = false
        setIsReady(false)
      }
    }
  }, [initEditor])

  // Update editor content when data changes (but only if editor is ready and data is different)
  useEffect(() => {
    if (isReady && editorRef.current && data && data !== dataRef.current) {
      editorRef.current.render(data).catch((error: any) => {
        console.error('Failed to render data:', error)
      })
    }
  }, [data, isReady])

  return (
    <div className="min-h-[300px]">
      <div id={editorId} />
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