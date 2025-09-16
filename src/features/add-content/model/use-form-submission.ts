import { useCallback } from 'react'
import { trpc } from '@/shared/api/trpc'
import { useAuth } from '@/shared/lib/auth-context'
import toast from 'react-hot-toast'
import type { ContentFormState, TodoItem, ParsedLinkData } from './types'

interface UseFormSubmissionProps {
  onSuccess: () => void
  onContentAdded?: () => void
}

export function useFormSubmission({ onSuccess, onContentAdded }: UseFormSubmissionProps) {
  const { session } = useAuth()

  const createContentMutation = trpc.content.create.useMutation({
    onSuccess: () => {
      toast.success('Saved')
      onSuccess()
      onContentAdded?.()
    },
    onError: (error) => {
      toast.error(`Error creating content: ${error.message}`)
    },
  })

  const uploadMultipleFiles = useCallback(async (
    files: File[],
    title?: string,
    tags?: string[]
  ): Promise<{ objectName: string, url: string, thumbnail?: string }[]> => {
    const formData = new FormData()
    files.forEach(file => formData.append('file', file))
    if (title?.trim()) formData.append('title', title.trim())
    if (tags && tags.length > 0) formData.append('tags', JSON.stringify(tags))

    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Upload failed')
    }

    const result = await response.json()
    if (result.errors && result.errors.length > 0) {
      console.warn('Some files failed to upload:', result.errors)
    }
    return result.files.map((file: any) => ({
      objectName: file.objectName,
      url: file.url,
      thumbnail: file.thumbnail
    }))
  }, [session?.access_token])

  const submitContent = useCallback(async (
    formState: ContentFormState,
    tags: string[],
    options: {
      editorData?: any
      todoItems?: TodoItem[]
      parsedLinkData?: ParsedLinkData | null
      selectedFiles?: File[]
    }
  ) => {
    const { type, title, content } = formState
    const { editorData, todoItems, parsedLinkData, selectedFiles } = options

    // Validation
    if (type === 'note' && (!editorData || !editorData.content || editorData.content.length === 0)) {
      return false
    }
    if (type === 'media' && (!selectedFiles || selectedFiles.length === 0)) {
      return false
    }
    if (type === 'todo' && (!todoItems || todoItems.length === 0 || todoItems.some(item => !item.text.trim()))) {
      return false
    }
    if (type === 'link' && !content.trim()) {
      return false
    }

    try {
      if (type === 'media' && selectedFiles && selectedFiles.length > 0) {
        await uploadMultipleFiles(selectedFiles, title, tags)
        toast.success('Saved')
        onSuccess()
        onContentAdded?.()
        return true
      } else {
        let finalContent = content

        if (type === 'note' && editorData) {
          finalContent = JSON.stringify(editorData)
        } else if (type === 'todo' && todoItems) {
          finalContent = JSON.stringify(todoItems)
        }

        const finalContentForLink = type === 'link' && parsedLinkData
          ? JSON.stringify(parsedLinkData)
          : finalContent

        createContentMutation.mutate({
          type,
          title: title.trim() || undefined,
          content: finalContentForLink,
          tags,
          url: type === 'link' ? parsedLinkData?.url || content.trim() : undefined,
        })
        return true
      }
    } catch (error) {
      toast.error(`Error uploading: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return false
    }
  }, [createContentMutation, uploadMultipleFiles, onSuccess, onContentAdded])

  return {
    submitContent,
    isLoading: createContentMutation.isPending,
  }
}
