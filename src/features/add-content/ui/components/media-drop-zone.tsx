'use client'

import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Upload, Plus, X } from 'lucide-react'
import Image from 'next/image'
import { DragEvent } from 'react'

interface MediaDropZoneProps {
  dragActive: boolean
  isLoading: boolean
  selectedFiles: File[]
  previewUrls: string[]
  onFileSelect: (files: FileList) => void
  onDrag: (e: DragEvent) => void
  onDrop: (e: DragEvent) => void
  onRemoveFile: (index: number) => void
  onMoveFile: (fromIndex: number, toIndex: number) => void
}

export function MediaDropZone({
  dragActive,
  isLoading,
  selectedFiles,
  previewUrls,
  onFileSelect,
  onDrag,
  onDrop,
  onRemoveFile,
  onMoveFile,
}: MediaDropZoneProps) {
  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${dragActive
            ? 'border-primary bg-primary/10 scale-[1.02]'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/20'
          }`}
        onDragEnter={onDrag}
        onDragLeave={onDrag}
        onDragOver={onDrag}
        onDrop={onDrop}
      >
        <div className="space-y-4">
          <div className={`transition-transform duration-200 ${dragActive ? 'scale-110' : ''}`}>
            <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              Перетащите файлы сюда
            </p>
            <p className="text-xs text-muted-foreground">
              или нажмите кнопку ниже для выбора
            </p>
            <p className="text-xs text-muted-foreground/70">
              Максимум 10MB • JPG, PNG, GIF, WebP, MP4, MOV, AVI
            </p>
          </div>
          <Input
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            id="file-upload"
            disabled={isLoading}
            onChange={(e) => e.target.files && onFileSelect(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={() => document.getElementById('file-upload')?.click()}
            className="mt-3 hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Выбрать файлы
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
                  onMoveFile(fromIndex, toIndex)
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
                  onClick={() => onRemoveFile(index)}
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
  )
}
