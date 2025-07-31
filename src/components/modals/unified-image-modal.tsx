'use client'

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { getSecureImageUrl } from "@/lib/image-utils"
import { Content } from "@/lib/schemas"
import { trpc } from "@/lib/trpc"
import { Session } from "@supabase/supabase-js"
import { ChevronLeft, ChevronRight, Edit2, Layers, Plus, Tag, Trash2, Ungroup, X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

interface UnifiedImageModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: Content
  session: Session | null
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  onContentChanged?: () => void
}

export function UnifiedImageModal({
  open,
  onOpenChange,
  item,
  session,
  onEdit,
  onDelete,
  onContentChanged
}: UnifiedImageModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const [direction, setDirection] = useState(0)
  const [showTags, setShowTags] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const router = useRouter()

  // Parse image URLs from content
  const imageUrls = (() => {
    try {
      const parsed = JSON.parse(item.content)
      if (Array.isArray(parsed)) {
        return parsed
      } else {
        return [item.content]
      }
    } catch {
      return [item.content]
    }
  })()

  const isMultiple = imageUrls.length > 1

  // Mutations
  const updateContentMutation = trpc.content.update.useMutation({
    onSuccess: () => {
      onContentChanged?.()
    }
  })

  const createContentMutation = trpc.content.create.useMutation({
    onSuccess: () => {
      onContentChanged?.()
    }
  })

  const deleteContentMutation = trpc.content.delete.useMutation({
    onSuccess: () => {
      onContentChanged?.()
      onOpenChange(false)
    }
  })

  // Reset index when modal opens
  useEffect(() => {
    if (open) {
      setCurrentIndex(0)
      setShowTags(false)
    }
  }, [open])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return

      switch (e.key) {
        case 'Escape':
          if (showTags) {
            setShowTags(false)
          } else {
            onOpenChange(false)
          }
          break
        case 'ArrowLeft':
          if (!showTags) {
            e.preventDefault()
            goToPrevious()
          }
          break
        case 'ArrowRight':
          if (!showTags) {
            e.preventDefault()
            goToNext()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, showTags])

  const goToNext = () => {
    if (currentIndex < imageUrls.length - 1) {
      setDirection(1)
      setCurrentIndex(currentIndex + 1)
    }
  }

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setDirection(-1)
      setCurrentIndex(currentIndex - 1)
    }
  }

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe && isMultiple) {
      goToNext()
    }
    if (isRightSwipe && isMultiple) {
      goToPrevious()
    }
  }

  // Разгруппировать изображения
  const handleUngroup = async () => {
    if (!isMultiple) return

    if (!confirm(`Разделить ${imageUrls.length} изображений на отдельные элементы?`)) return

    try {
      // Создаем отдельные элементы для каждого изображения
      const createPromises = imageUrls.map((url, index) => {
        return createContentMutation.mutateAsync({
          type: 'image',
          title: imageUrls.length > 1 && item.title
            ? `${item.title} (${index + 1})`
            : item.title,
          content: url,
          tags: item.tags || [],
        })
      })

      await Promise.all(createPromises)

      // Удаляем исходный элемент
      await deleteContentMutation.mutateAsync({ id: item.id })

      onOpenChange(false)
    } catch (error) {
      alert('Ошибка при разгруппировке')
    }
  }

  // Добавить тег к текущему изображению или ко всем
  const handleAddTag = async (toAll: boolean = false) => {
    if (!newTag.trim()) return

    try {
      if (toAll || !isMultiple) {
        // Добавляем тег ко всему элементу
        const updatedTags = [...new Set([...(item.tags || []), newTag.trim()])]
        await updateContentMutation.mutateAsync({
          id: item.id,
          tags: updatedTags
        })
      } else {
        // Для индивидуального тегирования создаем отдельный элемент
        // Пока упростим - добавляем ко всему элементу
        const updatedTags = [...new Set([...(item.tags || []), newTag.trim()])]
        await updateContentMutation.mutateAsync({
          id: item.id,
          tags: updatedTags
        })
      }

      setNewTag('')
    } catch (error) {
      alert('Ошибка при добавлении тега')
    }
  }

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0
    })
  }

  const handleEdit = () => {
    router.push(`/edit/${item.id}`)
    onOpenChange(false)
  }

  const handleDelete = () => {
    if (confirm('Удалить этот контент?')) {
      deleteContentMutation.mutate({ id: item.id })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none w-screen h-screen p-0 m-0 bg-black/95 border-none">
        <div
          className="w-full h-full flex flex-col relative"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Header */}
          <div className={`absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/50 to-transparent transition-opacity duration-300 ${isHovered || showTags ? 'opacity-100' : 'opacity-0'}`}>
            <div className="flex items-center justify-between text-white">
              <div className="flex-1">
                {item.title && (
                  <h2 className="text-lg font-semibold mb-1">{item.title}</h2>
                )}
                <div className="flex items-center gap-3 text-sm text-white/70">
                  {isMultiple && (
                    <>
                      <span>{currentIndex + 1} из {imageUrls.length}</span>
                      <div className="flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        <span>Группа</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isMultiple && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleUngroup}
                    className="text-white hover:bg-white/20"
                    title="Разгруппировать"
                  >
                    <Ungroup className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTags(!showTags)}
                  className="text-white hover:bg-white/20"
                  title="Теги"
                >
                  <Tag className="w-4 h-4" />
                </Button>
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEdit}
                    className="text-white hover:bg-white/20"
                    title="Редактировать"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    className="text-white hover:bg-white/20"
                    title="Удалить"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="text-white hover:bg-white/20"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Tags Panel */}
          {showTags && (
            <div className="absolute top-16 left-2 right-2 md:left-4 md:right-4 z-20 bg-black/90 backdrop-blur rounded-lg p-3 md:p-4 text-white max-h-60 overflow-y-auto">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Теги</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowTags(false)}
                    className="text-white/70 hover:text-white p-1"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Existing tags */}
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {item.tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="bg-white/20 text-white border-white/30 text-sm">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Add tag */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder="Добавить тег..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddTag(true)
                        e.preventDefault()
                      }
                    }}
                    className="bg-white/10 border-white/30 text-white placeholder:text-white/50 flex-1"
                  />
                  <Button
                    onClick={() => handleAddTag(true)}
                    disabled={!newTag.trim()}
                    className="bg-white/20 hover:bg-white/30 text-white shrink-0"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Добавить
                  </Button>
                </div>

                {isMultiple && (
                  <div className="pt-2 border-t border-white/20">
                    <p className="text-xs text-white/70">
                      Теги применяются ко всей группе изображений
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Main image area */}
          <div className="flex-1 flex items-center justify-center relative overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.img
                key={currentIndex}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 }
                }}
                src={getSecureImageUrl(imageUrls[currentIndex], session?.access_token)}
                alt={`${item.title || 'Изображение'} ${currentIndex + 1}`}
                className="w-full h-full object-contain cursor-pointer"
                draggable={false}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onError={(e) => {
                  e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDIwMCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTI4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04Ny41IDc0LjVMMTAwIDYyTDExMi41IDc0LjVMMTI1IDYyTDE0MCA3N1Y5NUg2MFY3N0w3NSA2Mkw4Ny41IDc0LjVaIiBmaWxsPSIjOUM5Q0EzIi8+CjxjaXJjbGUgY3g9Ijc1IiBjeT0iNTAiIHI9IjgiIGZpbGw9IiM5QzlDQTMiLz4KPFRLEHU+PC90ZXh0Pgo8L3N2Zz4K'
                }}
              />
            </AnimatePresence>

            {/* Navigation buttons */}
            {isMultiple && (
              <>
                <button
                  onClick={goToPrevious}
                  disabled={currentIndex === 0}
                  className={`absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-12 h-12 md:w-14 md:h-14 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed ${isHovered ? 'opacity-100' : 'md:opacity-0'} opacity-70 md:opacity-0`}
                >
                  <ChevronLeft className="w-6 h-6 md:w-7 md:h-7" />
                </button>
                <button
                  onClick={goToNext}
                  disabled={currentIndex === imageUrls.length - 1}
                  className={`absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-12 h-12 md:w-14 md:h-14 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed ${isHovered ? 'opacity-100' : 'md:opacity-0'} opacity-70 md:opacity-0`}
                >
                  <ChevronRight className="w-6 h-6 md:w-7 md:h-7" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnail navigation for multiple images */}
          {isMultiple && (
            <div className={`absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/50 to-transparent transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
              <div className="flex justify-center gap-2 max-w-full overflow-x-auto">
                {imageUrls.map((url, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setDirection(index > currentIndex ? 1 : -1)
                      setCurrentIndex(index)
                    }}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${index === currentIndex
                      ? 'border-white scale-110'
                      : 'border-white/30 hover:border-white/60'
                      }`}
                  >
                    <img
                      src={getSecureImageUrl(url, session?.access_token)}
                      alt={`Превью ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDIwMCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTI4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04Ny41IDc0LjVMMTAwIDYyTDExMi41IDc0LjVMMTI1IDYyTDE0MCA3N1Y5NUg2MFY3N0w3NSA2Mkw4Ny41IDc0LjVaIiBmaWxsPSIjOUM5Q0EzIi8+CjxjaXJjbGUgY3g9Ijc1IiBjeT0iNTAiIHI9IjgiIGZpbGw9IiM5QzlDQTMiLz4KPFRLEHU+PC90ZXh0Pgo8L3N2Zz4K'
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 