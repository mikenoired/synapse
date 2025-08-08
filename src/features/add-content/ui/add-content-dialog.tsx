'use client'

import { trpc } from '@/shared/api/trpc'
import { useDashboard } from '@/shared/lib/dashboard-context'
import { Content } from '@/shared/lib/schemas'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Editor } from '@/widgets/editor/ui/editor'
import { FileText, Image as ImageIcon, Link, ListChecks, Maximize, Minimize, Plus, Upload, X } from 'lucide-react'
import React, { useCallback, useEffect, useState, TouchEvent, FormEvent, DragEvent } from 'react'
import toast from 'react-hot-toast'
import Image from 'next/image'
import { useAuth } from '@/shared/lib/auth-context'

interface AddContentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onContentAdded?: () => void
  initialTags?: string[]
}

async function getVideoThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.src = url
    video.crossOrigin = 'anonymous'
    video.muted = true
    video.playsInline = true
    video.currentTime = 0
    video.addEventListener('loadeddata', () => {
      video.currentTime = 0
    })
    video.addEventListener('seeked', () => {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/png')
        resolve(dataUrl)
      } else {
        reject(new Error('Canvas context is null'))
      }
      URL.revokeObjectURL(url)
    })
    video.addEventListener('error', (e) => {
      URL.revokeObjectURL(url)
      reject(new Error('Ошибка загрузки видео'))
    })
  })
}

export function AddContentDialog({ open, onOpenChange, onContentAdded, initialTags = [] }: AddContentDialogProps) {
  const { preloadedFiles, setPreloadedFiles } = useDashboard()
  const { session } = useAuth()
  const [type, setType] = useState<Content['type']>('note')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [editorData, setEditorData] = useState<any>(null)
  const [tags, setTags] = useState<string[]>(initialTags)
  const [currentTag, setCurrentTag] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [todoItems, setTodoItems] = useState<{ text: string; marked: boolean }[]>([])
  const [todoInput, setTodoInput] = useState('')

  const [startY, setStartY] = useState<number | null>(null)
  const handleTouchStart = (e: TouchEvent) => {
    setStartY(e.touches[0].clientY)
  }
  const handleTouchMove = (e: TouchEvent) => {
    if (startY !== null) {
      const deltaY = e.touches[0].clientY - startY
      if (deltaY > 120) {
        onOpenChange(false)
        setStartY(null)
      }
    }
  }
  const handleTouchEnd = () => setStartY(null)

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false)
      }
    }
    window.addEventListener('keydown', handleEsc)

    return () => {
      window.removeEventListener('keydown', handleEsc)
    }
  }, [onOpenChange])

  useEffect(() => {
    if (preloadedFiles.length > 0) {
      setType('media')
      handleFileSelect(preloadedFiles)
      setPreloadedFiles([])
    }
  }, [preloadedFiles])

  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [previewUrls])

  useEffect(() => {
    if (open) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [open])

  const createContentMutation = trpc.content.create.useMutation({
    onSuccess: () => {
      setTitle('')
      setContent('')
      setEditorData(null)
      setTags(initialTags)
      setCurrentTag('')
      setType('note')
      setSelectedFiles([])
      previewUrls.forEach(url => URL.revokeObjectURL(url))
      setPreviewUrls([])
      setTodoItems([])
      setTodoInput('')

      onOpenChange(false)
      onContentAdded?.()
    },
    onError: (error) => {
      toast.error(`Error creating content: ${error.message}`)
    },
  })

  const uploadMultipleFiles = async (files: File[]): Promise<{ objectName: string, url: string, thumbnail?: string }[]> => {
    const formData = new FormData()
    files.forEach(file => formData.append('file', file))

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
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (type === 'note') {
      if (!editorData || !editorData.content || editorData.content.length === 0) return
    } else if (type === 'media') {
      if (selectedFiles.length === 0) return
    } else if (type === 'todo') {
      if (todoItems.length === 0 || todoItems.some(item => !item.text.trim())) return
    } else {
      if (!content.trim()) return
    }

    try {
      if (type === 'media' && selectedFiles.length > 0) {
        setUploading(true)

        await uploadMultipleFiles(selectedFiles)

        setTitle('')
        setContent('')
        setEditorData(null)
        setTags(initialTags)
        setCurrentTag('')
        setType('note')
        setSelectedFiles([])
        previewUrls.forEach(url => URL.revokeObjectURL(url))
        setPreviewUrls([])

        toast.success('Saved')
        onOpenChange(false)
        onContentAdded?.()

      } else {
        let finalContent = content

        if (type === 'note' && editorData) {
          finalContent = JSON.stringify(editorData)
        } else if (type === 'todo') {
          finalContent = JSON.stringify(todoItems)
        }

        createContentMutation.mutate({
          type,
          title: title.trim() || undefined,
          content: finalContent,
          tags,
          url: type === 'link' ? content.trim() : undefined
        }, {
          onSuccess: () => toast.success('Saved')
        })
      }
    } catch (error) {
      toast.error(`Error uploading: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setUploading(false)
    }
  }

  const addTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      setTags([...tags, currentTag.trim()])
      setCurrentTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      addTag()
    }
  }

  const handleFileSelect = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const validFiles: File[] = []
    const previewPromises: Promise<string>[] = []

    for (const file of fileArray) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`Файл "${file.name}" слишком большой (максимум 10MB)`)
        continue
      }
      if (!(file.type.startsWith('image/') || file.type.startsWith('video/'))) {
        toast.error(`Файл "${file.name}" не является поддерживаемым медиа (картинка или видео)`)
        continue
      }
      validFiles.push(file)
      if (file.type.startsWith('image/')) {
        previewPromises.push(Promise.resolve(URL.createObjectURL(file)))
      } else if (file.type.startsWith('video/')) {
        previewPromises.push(getVideoThumbnail(file))
      }
    }

    if (validFiles.length > 0) {
      previewUrls.forEach(url => URL.revokeObjectURL(url))
      const newPreviewUrls = await Promise.all(previewPromises)
      setPreviewUrls(newPreviewUrls)
      setSelectedFiles(validFiles)
      setContent(validFiles.map(f => f.name).join(', '))
    }
  }, [previewUrls])

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index)
    const newUrls = previewUrls.filter((_, i) => i !== index)

    URL.revokeObjectURL(previewUrls[index])

    setSelectedFiles(newFiles)
    setPreviewUrls(newUrls)
    setContent(newFiles.map(f => f.name).join(', '))
  }

  const moveFile = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return

    const newFiles = [...selectedFiles]
    const newUrls = [...previewUrls]

    const [movedFile] = newFiles.splice(fromIndex, 1)
    const [movedUrl] = newUrls.splice(fromIndex, 1)

    newFiles.splice(toIndex, 0, movedFile)
    newUrls.splice(toIndex, 0, movedUrl)

    setSelectedFiles(newFiles)
    setPreviewUrls(newUrls)
    setContent(newFiles.map(f => f.name).join(', '))
  }

  const handleDrag = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files)
    }
  }, [handleFileSelect])

  const handleAddTodo = () => {
    const value = todoInput.trim()
    if (value) {
      setTodoItems([...todoItems, { text: value, marked: false }])
      setTodoInput('')
    }
  }
  const handleRemoveTodo = (idx: number) => {
    setTodoItems(todoItems.filter((_, i) => i !== idx))
  }
  const handleToggleTodo = (idx: number) => {
    setTodoItems(todoItems.map((item, i) => i === idx ? { ...item, marked: !item.marked } : item))
  }
  const handleEditTodo = (idx: number, value: string) => {
    setTodoItems(todoItems.map((item, i) => i === idx ? { ...item, text: value } : item))
  }

  const isLoading = createContentMutation.isPending || uploading

  const getDialogSize = () => {
    if (isFullScreen && type === 'note') {
      return 'w-full h-full max-w-none rounded-none'
    }
    switch (type) {
      case 'note':
        return 'max-w-3xl w-[95vw] h-[90vh] rounded-lg'
      case 'media':
        return 'max-w-3xl w-[95vw] max-h-[90vh] h-auto rounded-lg'
      case 'link':
        return 'max-w-2xl w-[95vw] max-h-[80vh] h-auto rounded-lg'
      case 'todo':
        return 'max-w-3xl w-[95vw] max-h-[90vh] h-auto rounded-lg'
      default:
        return 'max-w-2xl w-[95vw] max-h-[80vh] h-auto rounded-lg'
    }
  }

  const handleTypeChange = (newType: Content['type']) => {
    if (type === 'note' && editorData && editorData.blocks && editorData.blocks.length > 0) {
      if (confirm('You have unsaved changes. Do you want to save them as a note?')) {
        handleSubmit(new Event('submit') as unknown as FormEvent)
      } else {
        setEditorData(null)
        setTitle('')
        setTags(initialTags)
        setType(newType)
      }
    } else if (type === 'todo' && todoItems.length > 0) {
      if (confirm('You have unsaved changes. Do you want to save them as a todo?')) {
        handleSubmit(new Event('submit') as unknown as FormEvent)
      } else {
        setTodoItems([])
        setTodoInput('')
        setType(newType)
      }
    }
    else {
      setType(newType)
      setSelectedFiles([])
      setContent('')
      setEditorData(null)
      previewUrls.forEach(url => URL.revokeObjectURL(url))
      setPreviewUrls([])
      setTodoItems([])
      setTodoInput('')
    }
  }

  const renderNoteForm = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 pb-4 border-b">
        <div className="max-w-[700px] mx-auto w-full">
          <Input
            id="title"
            placeholder="Title (optional)..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isLoading}
            className="!text-2xl font-bold border-none shadow-none !bg-transparent focus-visible:ring-0 h-auto px-0"
          />
          <div className="flex flex-wrap gap-2 mt-3">
            {tags.map(tag => (
              <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                  disabled={isLoading}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            <Input
              id="tags"
              placeholder="+ Add tag"
              value={currentTag}
              onChange={(e) => setCurrentTag(e.target.value)}
              onKeyDown={handleKeyDown}
              className="border-none shadow-none focus-visible:ring-0 h-auto flex-1"
              disabled={isLoading}
            />
          </div>
        </div>
      </div>


      <div className="flex-1 p-6 pt-2 overflow-y-auto">
        <div className="max-w-[700px] mx-auto w-full">
          <Editor
            data={editorData}
            onChange={setEditorData}
            readOnly={isLoading}
          />
        </div>
      </div>
    </div>
  )

  const renderTodoForm = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 pb-4 border-b">
        <div className="max-w-[700px] mx-auto w-full">
          <Input
            id="title"
            placeholder="Title (optional)..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isLoading}
            className="!text-2xl font-bold border-none shadow-none !bg-transparent focus-visible:ring-0 h-auto px-0"
          />
          <div className="flex flex-wrap gap-2 mt-3">
            {tags.map(tag => (
              <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                  disabled={isLoading}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            <Input
              id="tags"
              placeholder="+ Add tag"
              value={currentTag}
              onChange={(e) => setCurrentTag(e.target.value)}
              onKeyDown={handleKeyDown}
              className="border-none shadow-none focus-visible:ring-0 h-auto flex-1"
              disabled={isLoading}
            />
          </div>
        </div>
      </div>
      <div className="flex-1 p-6 pt-2 overflow-y-auto">
        <div className="max-w-[700px] mx-auto w-full flex flex-col gap-4">
          <div className="flex gap-2">
            <Input
              placeholder="Добавить пункт..."
              value={todoInput}
              onChange={e => setTodoInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddTodo() }}
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="button" onClick={handleAddTodo} disabled={!todoInput.trim() || isLoading} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Добавить
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            {todoItems.length === 0 && <div className="text-muted-foreground text-sm">Нет пунктов</div>}
            {todoItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 group">
                <Input
                  type="checkbox"
                  checked={item.marked}
                  onChange={() => handleToggleTodo(idx)}
                  className="w-5 h-5 cursor-pointer"
                  disabled={isLoading}
                />
                <Input
                  value={item.text}
                  onChange={e => handleEditTodo(idx, e.target.value)}
                  className="flex-1 px-2 py-1"
                  disabled={isLoading}
                />
                <button type="button" onClick={() => handleRemoveTodo(idx)} disabled={isLoading} className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="w-4 h-4 text-destructive" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )


  if (!open) return null

  return (
    <div
      className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center animate-in fade-in-0 transition-all duration-300 ease-in-out ${isFullScreen && type === 'note' ? 'p-5' : ''}`}
      onClick={() => onOpenChange(false)}
    >
      <div
        className={`bg-background shadow-lg relative ${getDialogSize()} p-0 gap-0 flex flex-col transition-all duration-300 ease-in-out animate-in fade-in-0 zoom-in-95`}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="p-4 border-b flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={type === 'note' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => handleTypeChange('note')}
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Заметка
            </Button>
            <Button
              type="button"
              variant={type === 'media' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => handleTypeChange('media')}
              className="flex items-center gap-2"
            >
              <ImageIcon className="w-4 h-4" />
              Images
            </Button>
            <Button
              type="button"
              variant={type === 'link' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => handleTypeChange('link')}
              className="flex items-center gap-2"
            >
              <Link className="w-4 h-4" />
              Link
            </Button>
            <Button
              type="button"
              variant={type === 'todo' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => handleTypeChange('todo')}
              className="flex items-center gap-2"
            >
              <ListChecks className="w-4 h-4" />
              Список
            </Button>
          </div>
          {type === 'note' && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsFullScreen(!isFullScreen)}>
                {isFullScreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </Button>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          {type === 'note' ? (
            renderNoteForm()
          ) : type === 'todo' ? (
            renderTodoForm()
          ) : (
            <div className="flex-1 p-6 space-y-4 overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="title">Title (optional)</Label>
                <Input
                  id="title"
                  placeholder="Enter title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">{type === 'link' ? 'URL' : 'Медиа (картинки и видео)'}</Label>
                {type === 'link' ? (
                  <Input
                    id="content"
                    type="url"
                    placeholder="https://example.com"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                ) : (
                  <div className="space-y-4">
                    {/* Drop Zone */}
                    <div
                      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                        }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      <div className="space-y-3">
                        <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">
                            Перетащите сюда картинки или видео, или выберите файлы
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Максимум 10MB на файл, форматы: JPG, PNG, GIF, WebP, MP4, MOV, AVI
                          </p>
                        </div>
                        <Input
                          type="file"
                          accept="image/*,video/*"
                          multiple
                          className="hidden"
                          id="file-upload"
                          disabled={isLoading}
                          onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isLoading}
                          onClick={() => document.getElementById('file-upload')?.click()}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Select files
                        </Button>
                      </div>
                    </div>

                    {selectedFiles.length > 0 && (
                      <div>
                        {selectedFiles.length > 1 && (
                          <p className="text-xs text-muted-foreground mb-2">
                            Перетащите изображения для изменения порядка
                          </p>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {previewUrls.map((url, index) => (
                            <div
                              key={index}
                              className="relative group cursor-move"
                              draggable={selectedFiles.length > 1}
                              onDragStart={(e) => {
                                e.dataTransfer.setData('text/plain', index.toString())
                                e.dataTransfer.effectAllowed = 'move'
                              }}
                              onDragOver={(e) => {
                                e.preventDefault()
                                e.dataTransfer.dropEffect = 'move'
                              }}
                              onDrop={(e) => {
                                e.preventDefault()
                                const fromIndex = parseInt(e.dataTransfer.getData('text/plain'))
                                const toIndex = index
                                moveFile(fromIndex, toIndex)
                              }}
                            >
                              <Image
                                src={url}
                                alt={`Превью ${index + 1}`}
                                className="w-full aspect-square object-cover rounded-lg border"
                                width={200}
                                height={200}
                              />
                              {selectedFiles.length > 1 && (
                                <div className="absolute top-1 left-1 w-5 h-5 bg-black/70 text-white rounded-full flex items-center justify-center text-xs font-medium">
                                  {index + 1}
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={() => removeFile(index)}
                                disabled={isLoading}
                                className="absolute top-1 right-1 w-6 h-6 bg-black/70 hover:bg-black/90 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                              <div className="absolute bottom-1 left-1 right-1">
                                <div className="bg-black/70 text-white text-xs px-1 py-0.5 rounded truncate">
                                  {selectedFiles[index].name}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label htmlFor="tags">Теги</Label>
                <div className="flex gap-2">
                  <Input
                    id="tags"
                    placeholder="Добавить тег..."
                    value={currentTag}
                    onChange={(e) => setCurrentTag(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1"
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    onClick={addTag}
                    disabled={!currentTag.trim() || isLoading}
                    size="sm"
                  >
                    Добавить
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                          disabled={isLoading}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="p-6 pt-4 border-t bg-background mt-auto sticky bottom-0 z-10">
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={
                  isLoading ||
                  (type === 'note'
                    ? !editorData || !editorData.content || editorData.content.length === 0
                    : type === 'media'
                      ? selectedFiles.length === 0
                      : type === 'todo'
                        ? todoItems.length === 0 || todoItems.some(item => !item.text.trim())
                        : !content.trim())
                }
              >
                {uploading
                  ? `Загружается ${selectedFiles.length} файл${selectedFiles.length > 1 ? (selectedFiles.length > 4 ? 'ов' : 'а') : ''
                  }...`
                  : createContentMutation.isPending
                    ? 'Сохранение...'
                    : 'Сохранить'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
} 