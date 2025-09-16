"use client"

import { Button } from '@/shared/ui/button'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import { EditorContent, JSONContent, useEditor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import { common, createLowlight } from 'lowlight'

interface EditorProps {
  data?: JSONContent | null
  onChange?: (data: JSONContent) => void
  readOnly?: boolean
}

export function Editor({ data, onChange, readOnly = false }: EditorProps) {
  const lowlight = createLowlight(common)
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      CodeBlockLowlight.configure({ lowlight }),
      Placeholder.configure({
        placeholder: 'Начните писать...',
      }),
    ],
    editorProps: {
      attributes: {
        class: 'min-h-[300px] border rounded-md p-2 bg-background relative',
      },
    },
    content: data || '',
    editable: !readOnly,
    onUpdate({ editor }) {
      if (onChange) onChange(editor.getJSON())
    },
  })

  return (
    <div>
      {editor && (
        <BubbleMenu editor={editor}>
          <div className="flex gap-1 bg-popover border rounded shadow p-1">
            <Button
              size="icon"
              variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
              onClick={() => editor.chain().focus().toggleBold().run()}
              aria-label="Bold"
            >
              <b>B</b>
            </Button>
            <Button
              size="icon"
              variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              aria-label="Italic"
            >
              <i>I</i>
            </Button>
            <Button
              size="icon"
              variant={editor.isActive('underline') ? 'secondary' : 'ghost'}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              aria-label="Underline"
            >
              <u>U</u>
            </Button>
            <Button
              size="icon"
              variant={editor.isActive('code') ? 'secondary' : 'ghost'}
              onClick={() => editor.chain().focus().toggleCode().run()}
              aria-label="Code"
            >
              {'</>'}
            </Button>
            <Button
              size="icon"
              variant={editor.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              aria-label="H2"
            >
              H2
            </Button>
            <Button
              size="icon"
              variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              aria-label="Bullet List"
            >
              •
            </Button>
            <Button
              size="icon"
              variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              aria-label="Ordered List"
            >
              1.
            </Button>
          </div>
        </BubbleMenu>
      )}
      <EditorContent editor={editor} />
    </div>
  )
}

export function editorDataToText(data: JSONContent): string {
  if (!data || !data.content) return ''

  function extractText(nodes: any[]): string {
    return nodes
      .map((node) => {
        if (node.type === 'text') return node.text || ''
        if (node.content) return extractText(node.content)
        return ''
      })
      .filter(Boolean)
      .join(' ')
  }

  return extractText(data.content).replace(/<[^>]*>/g, '').substring(0, 200)
}

export function editorDataToShortText(data: JSONContent, maxLength: number = 150): string {
  if (!data || !data.content) return ''

  let text = ''
  let currentLength = 0

  function walk(nodes: any[]): void {
    for (const node of nodes) {
      if (currentLength >= maxLength) break
      let nodeText = ''
      if (node.type === 'text') {
        nodeText = node.text || ''
      } else if (node.content) {
        nodeText = extractText(node.content)
      }
      if (currentLength + nodeText.length > maxLength) {
        nodeText = nodeText.substring(0, maxLength - currentLength - 3) + '...'
      }
      if (nodeText) {
        text += (text ? ' ' : '') + nodeText
        currentLength = text.length
      }
    }
  }

  function extractText(nodes: any[]): string {
    return nodes
      .map((node) => {
        if (node.type === 'text') return node.text || ''
        if (node.content) return extractText(node.content)
        return ''
      })
      .filter(Boolean)
      .join(' ')
  }

  walk(data.content)
  return text
} 