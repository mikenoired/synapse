'use client'

import { Editor } from '@/components/editor'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/auth-context'
import { useDashboard } from '@/lib/dashboard-context'
import { Content } from '@/lib/schemas'
import { trpc } from '@/lib/trpc'
import { FileText, Image, Link, Plus, Upload, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'

interface AddContentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onContentAdded?: () => void
}

export function AddContentDialog({ open, onOpenChange, onContentAdded }: AddContentDialogProps) {
  const { session } = useAuth()
  const { preloadedFiles, setPreloadedFiles } = useDashboard()

  const [type, setType] = useState<Content['type']>('note')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [editorData, setEditorData] = useState<any>(null)
  const [tags, setTags] = useState<string[]>([])
  const [currentTag, setCurrentTag] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  useEffect(() => {
    if (preloadedFiles.length > 0) {
      // Если есть предзагруженные файлы, переключаемся на тип 'image'
      // и инициализируем состояние файлов
      setType('image')
      handleFileSelect(preloadedFiles)
      // Очищаем предзагруженные файлы из контекста, чтобы они не использовались повторно
      setPreloadedFiles([])
    }
    // Мы хотим, чтобы этот эффект запускался только при изменении preloadedFiles из контекста
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preloadedFiles, setPreloadedFiles])


  // Cleanup preview URLs when component unmounts or files change
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [previewUrls])

  const createContentMutation = trpc.content.create.useMutation({
    onSuccess: () => {
      // Reset form
      setTitle('')
      setContent('')
      setEditorData(null)
      setTags([])
      setCurrentTag('')
      setType('note')
      setSelectedFiles([])
      previewUrls.forEach(url => URL.revokeObjectURL(url))
      setPreviewUrls([])

      onOpenChange(false)
      onContentAdded?.()
    },
    onError: (error) => {
      toast.error(`Ошибка создания контента: ${error.message}`)
    },
  })

  const uploadFile = async (file: File): Promise<{ objectName: string, url: string }> => {
    const formData = new FormData()
    formData.append('file', file)

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
    if (!result.success || !result.files || result.files.length === 0) {
      throw new Error(result.error || 'Upload processing failed')
    }
    return {
      objectName: result.files[0].objectName,
      url: result.files[0].url
    }
  }

  const uploadMultipleFiles = async (files: File[]): Promise<{ objectName: string, url: string }[]> => {
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
      url: file.url
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Проверяем наличие контента в зависимости от типа
    if (type === 'note') {
      if (!editorData || !editorData.blocks || editorData.blocks.length === 0) return
    } else if (type === 'image') {
      if (selectedFiles.length === 0) return
    } else {
      if (!content.trim()) return
    }

    try {
      if (type === 'image' && selectedFiles.length > 0) {
        setUploading(true)

        const uploadedFiles = await uploadMultipleFiles(selectedFiles)

        // Для каждой картинки создаем отдельный content item
        const createPromises = uploadedFiles.map((file, index) => {
          return createContentMutation.mutateAsync({
            type: 'image',
            title: title.trim() || undefined,
            content: file.objectName, // Имя объекта для обратной совместимости или ID
            image_url: file.url, // Публичный URL для отображения
            tags,
          })
        })

        await Promise.all(createPromises)

        // Сбрасываем форму и закрываем диалог после успешного выполнения ВСЕХ мутаций
        // (onSuccess в createContentMutation сработает для каждой, но мы хотим общие действия в конце)
        setTitle('')
        setContent('')
        setEditorData(null)
        setTags([])
        setCurrentTag('')
        setType('note')
        setSelectedFiles([])
        previewUrls.forEach(url => URL.revokeObjectURL(url))
        setPreviewUrls([])

        onOpenChange(false)
        onContentAdded?.()

      } else {
        // Обычная логика для заметок и ссылок
        let finalContent = content

        if (type === 'note' && editorData) {
          // Для заметок сохраняем данные EditorJS как JSON
          finalContent = JSON.stringify(editorData)
        }

        createContentMutation.mutate({
          type,
          title: title.trim() || undefined,
          content: finalContent,
          tags,
          // Для ссылок сохраняем URL в оба поля
          url: type === 'link' ? content.trim() : undefined
        })
      }
    } catch (error) {
      toast.error(`Ошибка загрузки: ${error instanceof Error ? error.message : 'Unknown error'}`)
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      addTag()
    }
  }

  const handleFileSelect = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const validFiles: File[] = []

    for (const file of fileArray) {
      // Проверяем размер файла (максимум 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`Файл "${file.name}" слишком большой (максимум 10MB)`)
        continue
      }

      // Проверяем тип файла
      if (!file.type.startsWith('image/')) {
        toast.error(`Файл "${file.name}" не является изображением`)
        continue
      }

      validFiles.push(file)
    }

    if (validFiles.length > 0) {
      // Cleanup previous preview URLs
      previewUrls.forEach(url => URL.revokeObjectURL(url))

      // Create new preview URLs
      const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file))
      setPreviewUrls(newPreviewUrls)
      setSelectedFiles(validFiles)
      setContent(validFiles.map(f => f.name).join(', '))
    }
  }, [previewUrls])

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index)
    const newUrls = previewUrls.filter((_, i) => i !== index)

    // Cleanup removed preview URL
    URL.revokeObjectURL(previewUrls[index])

    setSelectedFiles(newFiles)
    setPreviewUrls(newUrls)
    setContent(newFiles.map(f => f.name).join(', '))
  }

  const moveFile = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return

    const newFiles = [...selectedFiles]
    const newUrls = [...previewUrls]

    // Перемещаем элементы
    const [movedFile] = newFiles.splice(fromIndex, 1)
    const [movedUrl] = newUrls.splice(fromIndex, 1)

    newFiles.splice(toIndex, 0, movedFile)
    newUrls.splice(toIndex, 0, movedUrl)

    setSelectedFiles(newFiles)
    setPreviewUrls(newUrls)
    setContent(newFiles.map(f => f.name).join(', '))
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files)
    }
  }, [handleFileSelect])

  const isLoading = createContentMutation.isPending || uploading

  // Определяем размер диалога в зависимости от типа контента
  const getDialogSize = () => {
    switch (type) {
      case 'note':
        return 'max-w-4xl w-[95vw] max-h-[90vh] h-auto'
      case 'image':
        return 'max-w-3xl w-[95vw] max-h-[90vh] h-auto'
      case 'link':
        return 'max-w-2xl w-[95vw] max-h-[80vh] h-auto'
      default:
        return 'max-w-2xl w-[95vw] max-h-[80vh] h-auto'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${getDialogSize()} p-0 gap-0`}>
        <div className="flex flex-col h-full max-h-[90vh]">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle className="text-xl">Добавить контент</DialogTitle>
            <DialogDescription>
              Создайте заметку, добавьте ссылку или загрузите изображения
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 p-6 space-y-4 overflow-y-auto">
              {/* Type Selection */}
              <div className="space-y-3">
                <Label>Тип контента</Label>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant={type === 'note' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setType('note')
                      setSelectedFiles([])
                      setContent('')
                      setEditorData(null)
                      previewUrls.forEach(url => URL.revokeObjectURL(url))
                      setPreviewUrls([])
                    }}
                    className="flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Заметка
                  </Button>
                  <Button
                    type="button"
                    variant={type === 'image' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setType('image')
                      setSelectedFiles([])
                      setContent('')
                      setEditorData(null)
                      previewUrls.forEach(url => URL.revokeObjectURL(url))
                      setPreviewUrls([])
                    }}
                    className="flex items-center gap-2"
                  >
                    <Image className="w-4 h-4" />
                    Изображения
                  </Button>
                  <Button
                    type="button"
                    variant={type === 'link' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setType('link')
                      setSelectedFiles([])
                      setContent('')
                      setEditorData(null)
                      previewUrls.forEach(url => URL.revokeObjectURL(url))
                      setPreviewUrls([])
                    }}
                    className="flex items-center gap-2"
                  >
                    <Link className="w-4 h-4" />
                    Ссылка
                  </Button>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Заголовок (опционально)</Label>
                <Input
                  id="title"
                  placeholder="Введите заголовок..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label htmlFor="content">
                  {type === 'note' ? 'Содержание' :
                    type === 'link' ? 'URL' :
                      'Изображения'}
                </Label>
                {type === 'note' ? (
                  <div className="border rounded-lg overflow-hidden">
                    <Editor
                      data={editorData}
                      onChange={setEditorData}
                      placeholder="Начните писать..."
                      readOnly={isLoading}
                    />
                  </div>
                ) : type === 'link' ? (
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
                            Перетащите изображения сюда или нажмите для выбора
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Максимум 10MB на файл, форматы: JPG, PNG, GIF, WebP
                          </p>
                        </div>
                        <Input
                          type="file"
                          accept="image/*"
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
                          Выбрать файлы
                        </Button>
                      </div>
                    </div>

                    {/* Image Previews */}
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
                              <img
                                src={url}
                                alt={`Превью ${index + 1}`}
                                className="w-full aspect-square object-cover rounded-lg border"
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

              {/* Tags */}
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

            {/* Submit */}
            <div className="p-6 pt-4 border-t bg-background">
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
                  disabled={isLoading || (
                    type === 'note'
                      ? !editorData || !editorData.blocks || editorData.blocks.length === 0
                      : type === 'image'
                        ? selectedFiles.length === 0
                        : !content.trim()
                  )}
                >
                  {uploading ? `Загружается ${selectedFiles.length} файл${selectedFiles.length > 1 ? (selectedFiles.length > 4 ? 'ов' : 'а') : ''}...` :
                    createContentMutation.isPending ? 'Сохранение...' :
                      'Сохранить'}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
} 