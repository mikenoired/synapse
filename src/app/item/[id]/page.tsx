'use client'

import { EditorRenderer } from "@/components/editor-renderer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/lib/auth-context"
import { getSecureImageUrl } from "@/lib/image-utils"
import { trpc } from "@/lib/trpc"
import { ArrowLeft, Calendar, Clock, FileText, Image, Link, Pencil, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { use, useEffect } from "react"

interface ItemPageProps {
  params: Promise<{
    id: string
  }>
}

export default function ItemPage({ params }: ItemPageProps) {
  const { user, loading, session } = useAuth()
  const router = useRouter()
  const resolvedParams = use(params)

  // Проверяем аутентификацию
  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  const {
    data: item,
    isLoading,
    error,
  } = trpc.content.getById.useQuery({
    id: resolvedParams.id,
  })

  const deleteMutation = trpc.content.delete.useMutation({
    onSuccess: () => {
      router.push('/dashboard')
    }
  })

  const handleDelete = () => {
    if (confirm('Вы уверены, что хотите удалить этот элемент?')) {
      deleteMutation.mutate({ id: resolvedParams.id })
    }
  }

  const handleEdit = () => {
    router.push(`/edit/${resolvedParams.id}`)
  }

  const handleBack = () => {
    router.back()
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'note': return <FileText className="w-5 h-5" />
      case 'image': return <Image className="w-5 h-5" />
      case 'link': return <Link className="w-5 h-5" />
      default: return <FileText className="w-5 h-5" />
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'note': return 'Заметка'
      case 'image': return 'Изображение'
      case 'link': return 'Ссылка'
      default: return 'Заметка'
    }
  }

  // Показываем загрузку пока проверяем аутентификацию
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Если пользователь не авторизован, показываем ничего (должно перенаправить)
  if (!user) {
    return null
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Button variant="ghost" onClick={handleBack} className="p-0">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Назад
              </Button>
            </div>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">Элемент не найден</p>
            <Button onClick={handleBack} className="mt-4">
              Вернуться к списку
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button variant="ghost" onClick={handleBack} className="p-0">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleEdit}>
                <Pencil className="w-4 h-4 mr-2" />
                Редактировать
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Удалить
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          </div>
        ) : item ? (
          <div className="space-y-6">
            {/* Header */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {getTypeIcon(item.type)}
                <span>{getTypeLabel(item.type)}</span>
              </div>
              {item.title && (
                <h1 className="text-3xl font-bold tracking-tight">{item.title}</h1>
              )}
            </div>

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>Создано: {new Date(item.created_at).toLocaleDateString('ru-RU', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</span>
              </div>
              {item.updated_at !== item.created_at && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>Обновлено: {new Date(item.updated_at).toLocaleDateString('ru-RU', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {item.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag: string) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Content */}
            <Card>
              <CardContent className="pt-6">
                {item.type === 'image' ? (
                  <img
                    src={getSecureImageUrl(item.content, session?.access_token)}
                    alt={item.title || 'Изображение'}
                    className="w-full max-w-2xl mx-auto rounded-lg shadow-sm"
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDIwMCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTI4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04Ny41IDc0LjVMMTAwIDYyTDExMi41IDc0LjVMMTI1IDYyTDE0MCA3N1Y5NUg2MFY3N0w3NSA2Mkw4Ny41IDc0LjVaIiBmaWxsPSIjOUM5Q0EzIi8+CjxjaXJjbGUgY3g9Ijc1IiBjeT0iNTAiIHI9IjgiIGZpbGw9IiM5QzlDQTMiLz4KPHRLEHU+PC90ZXh0Pgo8L3N2Zz4K'
                    }}
                  />
                ) : item.type === 'link' ? (
                  <div className="space-y-4">
                    <div>
                      <p className="font-medium mb-2">Ссылка:</p>
                      <a
                        href={item.content}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                      >
                        {item.content}
                      </a>
                    </div>
                    <Button asChild>
                      <a
                        href={item.content}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Открыть ссылку
                      </a>
                    </Button>
                  </div>
                ) : (
                  <div className="text-sm leading-relaxed">
                    {(() => {
                      // Try to parse as EditorJS data for notes
                      if (item.type === 'note') {
                        try {
                          const parsedData = JSON.parse(item.content)
                          if (parsedData.blocks) {
                            return <EditorRenderer data={parsedData} />
                          }
                        } catch {
                          // Fallback to plain text
                        }
                      }

                      // For non-notes or plain text content
                      return (
                        <pre className="whitespace-pre-wrap font-sans text-foreground">
                          {item.content}
                        </pre>
                      )
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reminder */}
            {item.reminder_at && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Напоминание
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p>{new Date(item.reminder_at).toLocaleDateString('ru-RU', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</p>
                </CardContent>
              </Card>
            )}
          </div>
        ) : null}
      </main>
    </div>
  )
} 