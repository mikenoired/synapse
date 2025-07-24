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
import { Content } from '@/lib/schemas'
import { trpc } from '@/lib/trpc'
import { FileText, Image, Link, Upload, X } from 'lucide-react'
import { useEffect, useState } from 'react'

interface AddContentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onContentAdded?: () => void
}

export function AddContentDialog({ open, onOpenChange, onContentAdded }: AddContentDialogProps) {
  const { session } = useAuth()
  const [type, setType] = useState<Content['type']>('note')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [editorData, setEditorData] = useState<any>(null)
  const [tags, setTags] = useState<string[]>([])
  const [currentTag, setCurrentTag] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  // Cleanup preview URL when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const createContentMutation = trpc.content.create.useMutation({
    onSuccess: () => {
      // Reset form
      setTitle('')
      setContent('')
      setEditorData(null)
      setTags([])
      setCurrentTag('')
      setType('note')
      setSelectedFile(null)
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
      }

      onOpenChange(false)
      onContentAdded?.()
    },
    onError: (error) => {
      alert(`Ошибка создания контента: ${error.message}`)
    },
  })

  const uploadFile = async (file: File): Promise<string> => {
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
    return result.objectName
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Проверяем наличие контента в зависимости от типа
    if (type === 'note') {
      if (!editorData || !editorData.blocks || editorData.blocks.length === 0) return
    } else if (type === 'image') {
      if (!selectedFile) return
    } else {
      if (!content.trim()) return
    }

    try {
      let finalContent = content

      // Если это изображение и есть файл, загружаем его
      if (type === 'image' && selectedFile) {
        setUploading(true)
        finalContent = await uploadFile(selectedFile)
      } else if (type === 'note' && editorData) {
        // Для заметок сохраняем данные EditorJS как JSON
        finalContent = JSON.stringify(editorData)
      }

      createContentMutation.mutate({
        type,
        title: title.trim() || undefined,
        content: finalContent,
        tags,
      })
    } catch (error) {
      alert(`Ошибка загрузки: ${error instanceof Error ? error.message : 'Unknown error'}`)
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Проверяем размер файла (максимум 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Файл слишком большой (максимум 10MB)')
        return
      }

      // Проверяем тип файла
      if (!file.type.startsWith('image/')) {
        alert('Можно загружать только изображения')
        return
      }

      // Cleanup previous preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }

      // Create new preview URL
      const newPreviewUrl = URL.createObjectURL(file)
      setPreviewUrl(newPreviewUrl)
      setSelectedFile(file)
      setContent(file.name)
    }
  }

  const isLoading = createContentMutation.isPending || uploading

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-h-screen max-w-none w-screen h-screen p-0 m-0 rounded-none sm:min-h-[calc(100vh-48px)] sm:max-w-none sm:w-[calc(100vw-48px)] sm:h-[calc(100vh-48px)] sm:rounded-lg">
        <div className="flex flex-col h-full">
          <DialogHeader className="p-6 border-b">
            <DialogTitle className="text-2xl">Добавить новый контент</DialogTitle>
            <DialogDescription>
              Создайте заметку, добавьте ссылку или загрузите изображение
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
            <div className="flex-1 p-6 space-y-6 overflow-y-auto">
              {/* Type Selection */}
              <div className="space-y-3">
                <Label>Тип контента</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={type === 'note' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setType('note')
                      setSelectedFile(null)
                      setContent('')
                      setEditorData(null)
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
                      setSelectedFile(null)
                      setContent('')
                      setEditorData(null)
                    }}
                    className="flex items-center gap-2"
                  >
                    <Image className="w-4 h-4" />
                    Изображение
                  </Button>
                  <Button
                    type="button"
                    variant={type === 'link' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setType('link')
                      setSelectedFile(null)
                      setContent('')
                      setEditorData(null)
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
                      'Файл изображения'}
                </Label>
                {type === 'note' ? (
                  <Editor
                    data={editorData}
                    onChange={setEditorData}
                    placeholder="Начните писать..."
                    readOnly={isLoading}
                  />
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
                ) : selectedFile && previewUrl ? (
                  // Показываем превью загруженного изображения
                  <div className="relative group">
                    <img
                      src={previewUrl}
                      alt="Превью"
                      className="w-full rounded-lg border"
                    />
                    {/* Кнопка удаления появляется при наведении */}
                    <button
                      type="button"
                      onClick={() => {
                        if (previewUrl) {
                          URL.revokeObjectURL(previewUrl)
                          setPreviewUrl(null)
                        }
                        setSelectedFile(null)
                        setContent('')
                      }}
                      disabled={isLoading}
                      className="absolute top-2 right-2 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  // Поле для загрузки изображения
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                    <div className="space-y-4">
                      <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Перетащите изображение сюда или нажмите для выбора
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Максимум 10MB, форматы: JPG, PNG, GIF, WebP
                        </p>
                      </div>
                      <Input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id="file-upload"
                        disabled={isLoading}
                        onChange={handleFileSelect}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isLoading}
                        onClick={() => document.getElementById('file-upload')?.click()}
                      >
                        Выбрать файл
                      </Button>
                    </div>
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
            <div className="p-6 border-t bg-background">
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
                        ? !selectedFile
                        : !content.trim()
                  )}
                >
                  {uploading ? 'Загрузка...' :
                    isLoading ? 'Сохранение...' :
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