'use client'

import type { JSONContent } from '@tiptap/core'
import { generateHTML } from '@tiptap/core'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Underline from '@tiptap/extension-underline'
import StarterKit from '@tiptap/starter-kit'
import DOMPurify from 'dompurify'
import { common, createLowlight } from 'lowlight'
import { cn } from '@/shared/lib/utils'
import proseClasses from '@/shared/ui/prose-classes'

const lowlight = createLowlight(common)

interface EditorRendererProps {
  data: JSONContent | null
}

export function EditorRenderer({ data }: EditorRendererProps) {
  if (!data || !data.content)
    return null

  const html = generateHTML(data, [
    StarterKit,
    Underline,
    CodeBlockLowlight.configure({ lowlight }),
  ])

  return (
    <div className={cn('max-w-none', proseClasses)} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />
  )
}
