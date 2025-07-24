'use client'

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getSecureImageUrl } from "@/lib/image-utils"
import { Content } from "@/lib/schemas"
import { Session } from "@supabase/supabase-js"
import { Calendar, ChevronLeft, ChevronRight, Clock, Pencil, Trash2, X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

interface ImageGalleryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: Content[]
  initialIndex: number
  session: Session | null
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

export function ImageGalleryModal({
  open,
  onOpenChange,
  items,
  initialIndex,
  session,
  onEdit,
  onDelete
}: ImageGalleryModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [isHovered, setIsHovered] = useState(false)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [direction, setDirection] = useState(0) // -1 for left, 1 for right
  const router = useRouter()

  const currentItem = items[currentIndex]

  // Reset index when modal opens
  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex)
    }
  }, [open, initialIndex])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return

      switch (e.key) {
        case 'Escape':
          onOpenChange(false)
          break
        case 'ArrowLeft':
          e.preventDefault()
          goToPrevious()
          break
        case 'ArrowRight':
          e.preventDefault()
          goToNext()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }

    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [open])

  const goToPrevious = useCallback(() => {
    setDirection(-1)
    setCurrentIndex(prev => prev > 0 ? prev - 1 : items.length - 1)
  }, [items.length])

  const goToNext = useCallback(() => {
    setDirection(1)
    setCurrentIndex(prev => prev < items.length - 1 ? prev + 1 : 0)
  }, [items.length])

  // Touch handlers for mobile swipe
  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) {
      goToNext()
    } else if (isRightSwipe) {
      goToPrevious()
    }
  }

  const handleEdit = () => {
    if (onEdit && currentItem) {
      onEdit(currentItem.id)
      onOpenChange(false)
    } else {
      router.push(`/edit/${currentItem?.id}`)
      onOpenChange(false)
    }
  }

  const handleDelete = () => {
    if (onDelete && currentItem && confirm('Вы уверены, что хотите удалить этот элемент?')) {
      onDelete(currentItem.id)
      onOpenChange(false)
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onOpenChange(false)
    }
  }

  // Animation variants for horizontal slide
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction > 0 ? '-100%' : '100%',
      opacity: 0
    })
  }

  if (!open || !currentItem) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-black/80"
      onClick={handleBackdropClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Close button - Top Right */}
      <AnimatePresence>
        {isHovered && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => onOpenChange(false)}
            className="absolute top-6 right-6 z-50 p-3 bg-black/60 hover:bg-black/80 rounded-full text-white transition-all backdrop-blur-sm hover:scale-110"
          >
            <X className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Navigation arrows */}
      {items.length > 1 && (
        <>
          {/* Left arrow */}
          <AnimatePresence>
            {isHovered && (
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onClick={goToPrevious}
                className="absolute left-6 top-1/2 -translate-y-1/2 z-40 p-4 bg-black/60 hover:bg-black/80 rounded-full text-white transition-all backdrop-blur-sm hover:scale-110"
              >
                <ChevronLeft className="w-8 h-8" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Right arrow */}
          <AnimatePresence>
            {isHovered && (
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onClick={goToNext}
                className="absolute right-6 top-1/2 -translate-y-1/2 z-40 p-4 bg-black/60 hover:bg-black/80 rounded-full text-white transition-all backdrop-blur-sm hover:scale-110"
              >
                <ChevronRight className="w-8 h-8" />
              </motion.button>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Main image container - Full screen */}
      <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.img
            key={currentItem.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 }
            }}
            src={getSecureImageUrl(currentItem.content, session?.access_token)}
            alt={currentItem.title || 'Изображение'}
            className="w-full h-full object-contain cursor-pointer"
            draggable={false}
            onError={(e) => {
              e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDIwMCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTI4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04Ny41IDc0LjVMMTAwIDYyTDExMi41IDc0LjVMMTI1IDYyTDE0MCA3N1Y5NUg2MFY3N0w3NSA2Mkw4Ny41IDc0LjVaIiBmaWxsPSIjOUM5Q0EzIi8+CjxjaXJjbGUgY3g9Ijc1IiBjeT0iNTAiIHI9IjgiIGZpbGw9IiM5QzlDQTMiLz4KPHRLEHU+PC90ZXh0Pgo8L3N2Zz4K'
            }}
          />
        </AnimatePresence>
      </div>

      {/* Top overlay with title and pagination counter */}
      <AnimatePresence>
        {isHovered && currentItem.title && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/90 via-black/50 to-transparent p-6 backdrop-blur-sm"
          >
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white pr-16">
                {currentItem.title}
              </h2>

              {/* Counter - Top Right */}
              {items.length > 1 && (
                <div className="text-sm text-white/80 bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
                  {currentIndex + 1} / {items.length}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom overlay with metadata and controls */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-6 backdrop-blur-sm"
          >
            <div className="max-w-4xl mx-auto">
              {/* Metadata */}
              <div className="space-y-3 mb-4">
                <div className="flex flex-wrap items-center gap-4 text-sm text-white/70">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(currentItem.created_at).toLocaleDateString('ru-RU')}</span>
                  </div>
                  {currentItem.updated_at !== currentItem.created_at && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>Обновлено: {new Date(currentItem.updated_at).toLocaleDateString('ru-RU')}</span>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {currentItem.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {currentItem.tags.map((tag: string) => (
                      <Badge key={tag} variant="outline" className="bg-white/20 border-white/30 text-white">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between">
                {/* Pagination dots */}
                {items.length > 1 && (
                  <div className="flex gap-2">
                    {items.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setDirection(index > currentIndex ? 1 : -1)
                          setCurrentIndex(index)
                        }}
                        className={`h-2 rounded-full transition-all ${index === currentIndex
                          ? 'bg-white w-8'
                          : 'bg-white/50 hover:bg-white/70 w-2'
                          }`}
                      />
                    ))}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleEdit}
                    className="bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm"
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    Редактировать
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleDelete}
                    className="bg-red-600/80 hover:bg-red-600 backdrop-blur-sm"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Удалить
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
} 