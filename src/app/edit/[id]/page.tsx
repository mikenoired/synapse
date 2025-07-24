'use client'

import { Editor } from '@/components/editor'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/auth-context'
import { Content } from '@/lib/schemas'
import { trpc } from '@/lib/trpc'
import { ArrowLeft, FileText, Image, Link, Upload, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface EditPageProps {
  params: { id: string }
}

export default function EditPage({ params }: EditPageProps) {
  const router = useRouter()
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

  const { data: item, isLoading } = trpc.content.getById.useQuery({ id: params.id })

  const updateContentMutation = trpc.content.update.useMutation({
    onSuccess: () => {
      router.push('/dashboard')
    },
    onError: (error) => {
      alert(`Ошибка обновления контента: ${error.message}`)
    },
  })

  // Load data when item is fetched
  useEffect(() => {
    if (item) {
      setType(item.type)
      setTitle(item.title || '')
      setTags(item.tags || [])

      if (item.type === 'note') {
        // Try to parse as EditorJS data, fallback to plain text
        try {
          const parsedData = JSON.parse(item.content)
          if (parsedData.blocks) {
            setEditorData(parsedData)
          } else {
            // Convert plain text to EditorJS format
            setEditorData({
              time: Date.now(),
              blocks: [{
                type: 'paragraph',
                data: { text: item.content }
              }],
              version: '2.30.8'
            })
          }
        } catch {
          // Convert plain text to EditorJS format
          setEditorData({
            time: Date.now(),
            blocks: [{
              type: 'paragraph',
              data: { text: item.content }
            }],
            version: '2.30.8'
          })
        }
      } else {
        setContent(item.content)
      }
    }
  }, [item])

  // Cleanup preview URL when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

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
      if (!selectedFile && !content.trim()) return
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

      updateContentMutation.mutate({
        id: params.id,
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

  const isLoadingState = updateContentMutation.isPending || uploading || isLoading

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background/80 backdrop-blur-sm flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Загрузка...</p>
        </div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-background/80 backdrop-blur-sm flex items-center justify-center">
        <div className="text-center">
          <p>Контент не найден</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Вернуться
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background/80 backdrop-blur-sm p-6 md:p-24">
      <div className="max-w-4xl mx-auto bg-background rounded-lg shadow-lg">
        <div className="p-6 border-b">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Назад
            </Button>
            <h1 className="text-2xl font-bold">Редактировать контент</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
              disabled={isLoadingState}
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
                readOnly={isLoadingState}
              />
            ) : type === 'link' ? (
              <Input
                id="content"
                type="url"
                placeholder="https://example.com"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                disabled={isLoadingState}
              />
            ) : selectedFile && previewUrl ? (
              <div className="relative group">
                <img
                  src={previewUrl}
                  alt="Превью"
                  className="w-full rounded-lg border"
                />
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
                  disabled={isLoadingState}
                  className="absolute top-2 right-2 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
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
                    disabled={isLoadingState}
                    onChange={handleFileSelect}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isLoadingState}
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
                disabled={isLoadingState}
              />
              <Button
                type="button"
                onClick={addTag}
                disabled={!currentTag.trim() || isLoadingState}
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
                      disabled={isLoadingState}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard')}
              disabled={isLoadingState}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={isLoadingState || (
                type === 'note'
                  ? !editorData || !editorData.blocks || editorData.blocks.length === 0
                  : type === 'image'
                    ? !selectedFile && !content.trim()
                    : !content.trim()
              )}
            >
              {uploading ? 'Загрузка...' :
                isLoadingState ? 'Сохранение...' :
                  'Сохранить изменения'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
} 