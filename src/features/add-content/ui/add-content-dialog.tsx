'use client'

import type { FormEvent, TouchEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useDashboard } from '@/shared/lib/dashboard-context'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { AddContentProvider, useAddContent } from '../model/add-content-context'
import {
  ContentTypeSelector,
  LinkPreview,
  MediaDropZone,
  TagInput,
} from './components'
import AddNoteView from './note'
import AddTodoView from './todo'

interface AddContentDialogProps {
  open: boolean // Used by parent component for conditional rendering
  onOpenChange: (_open: any) => void
  onContentAdded?: () => void
  initialTags?: string[]
}

interface AddContentDialogContentProps {
  onOpenChange: (_open: any) => void
  onContentAdded?: () => void
}

function AddContentDialogContent({ onOpenChange, onContentAdded }: AddContentDialogContentProps) {
  const { preloadedFiles, setPreloadedFiles } = useDashboard()
  const [startY, setStartY] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)

  const {
    formState,
    updateType,
    updateTitle,
    updateContent,
    toggleFullScreen,
    tags,
    currentTag,
    updateCurrentTag,
    addTag,
    removeTag,
    handleTagKeyDown,
    selectedFiles,
    previewUrls,
    dragActive,
    handleFileSelect,
    removeFile,
    moveFile,
    handleDrag,
    handleDrop,
    parsedLinkData,
    linkParsing,
    parseLink,
    clearParsedData,
    submitContent,
    uploadFiles,
    isSubmitting,
    resetForm,
  } = useAddContent()

  const { type, title, content, isFullScreen } = formState
  const [makeTrack, setMakeTrack] = useState(false)

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
      if (event.key === 'Escape')
        onOpenChange(false)
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onOpenChange])

  useEffect(() => {
    if (preloadedFiles.length > 0) {
      updateType('media')
      handleFileSelect(preloadedFiles)
      setPreloadedFiles([])
    }
  }, [preloadedFiles, updateType, handleFileSelect, setPreloadedFiles])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (type === 'media' && selectedFiles.length > 0)
      setUploading(true)

    try {
      let success = false
      if (type === 'audio' && selectedFiles.length > 0) {
        setUploading(true)
        const files = await uploadFiles(selectedFiles, title, tags, { makeTrack })
        if (files && files.length > 0) {
          toast.success('Saved')
          success = true
        }
        else {
          toast.error('Не удалось загрузить файл')
          success = false
        }
      }
      else {
        success = await submitContent()
      }
      if (success) {
        resetForm()
        onOpenChange(false)
        onContentAdded?.()
      }
    }
    finally {
      setUploading(false)
    }
  }

  const isLoading = isSubmitting || uploading

  const getDialogSize = () => {
    if (isFullScreen && type === 'note') {
      return 'w-full h-full max-w-none rounded-none'
    }
    switch (type) {
      case 'note':
        return 'max-w-3xl w-[95vw] h-[90vh]'
      case 'media':
        return 'max-w-3xl w-[95vw] max-h-[80vh] h-auto'
      case 'link':
        return 'max-w-2xl w-[95vw] max-h-[80vh] h-auto'
      case 'todo':
        return 'max-w-3xl w-[95vw] max-h-[90vh] h-auto'
      default:
        return 'max-w-2xl w-[95vw] max-h-[80vh] h-auto'
    }
  }

  const handleTypeChange = (newType: typeof type) => {
    // TODO: Add confirmation dialogs for unsaved changes
    updateType(newType)
  }

  const getSubmitButtonText = () => {
    if (uploading) {
      return `Загружается ${selectedFiles.length} файл${selectedFiles.length > 1 ? (selectedFiles.length > 4 ? 'ов' : 'а') : ''
      }...`
    }
    if (isSubmitting) {
      return 'Сохранение...'
    }
    return 'Сохранить'
  }

  const isSubmitDisabled = () => {
    if (isLoading || linkParsing)
      return true

    switch (type) {
      case 'note':
        return false
      case 'media':
        return selectedFiles.length === 0
      case 'audio':
        return selectedFiles.length === 0
      case 'todo':
        return false
      case 'link':
        return !content.trim() || !parsedLinkData
      default:
        return !content.trim()
    }
  }

  return (
    <div
      className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center animate-in fade-in-0 transition-all duration-300 ease-in-out ${isFullScreen && type === 'note' ? 'p-5' : ''}`}
      onClick={() => onOpenChange(false)}
    >
      <div
        className={`bg-background shadow-lg overflow-hidden relative ${getDialogSize()} p-0 gap-0 flex flex-col transition-all duration-300 ease-in-out animate-in fade-in-0 zoom-in-95 rounded-lg`}
        onClick={e => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <ContentTypeSelector
          type={type}
          onTypeChange={handleTypeChange}
          isFullScreen={isFullScreen}
          onToggleFullScreen={toggleFullScreen}
        />

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <AnimatePresence mode="wait" initial={false}>
            {type === 'note'
              ? (
                  <motion.div
                    key="note-view"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{
                      duration: 0.2,
                      ease: [0.4, 0, 0.2, 1],
                      opacity: { duration: 0.2 },
                      height: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
                    }}
                    style={{ overflow: 'hidden' }}
                    className="flex-1"
                  >
                    <AddNoteView />
                  </motion.div>
                )
              : type === 'todo'
                ? (
                    <motion.div
                      key="todo-view"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{
                        duration: 0.2,
                        ease: [0.4, 0, 0.2, 1],
                        opacity: { duration: 0.2 },
                        height: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
                      }}
                      style={{ overflow: 'hidden' }}
                      className="flex-1"
                    >
                      <AddTodoView />
                    </motion.div>
                  )
                : (
                    <motion.div
                      key="media-audio-link-view"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{
                        duration: 0.2,
                        ease: [0.4, 0, 0.2, 1],
                        opacity: { duration: 0.2 },
                        height: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
                      }}
                      style={{ overflow: 'hidden' }}
                      className="flex-1 p-6 space-y-4 overflow-y-auto"
                    >
                      <div className="space-y-2">
                        <Label htmlFor="title">Title (optional)</Label>
                        <Input
                          id="title"
                          placeholder="Enter title..."
                          value={title}
                          onChange={e => updateTitle(e.target.value)}
                          disabled={isLoading}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="content">
                          {type === 'link' ? 'URL' : type === 'audio' ? 'Аудио' : 'Медиа (картинки и видео)'}
                        </Label>
                        <AnimatePresence mode="wait" initial={false}>
                          {type === 'link'
                            ? (
                                <motion.div
                                  key="link-preview"
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{
                                    duration: 0.2,
                                    ease: [0.4, 0, 0.2, 1],
                                    opacity: { duration: 0.2 },
                                    height: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
                                  }}
                                  style={{ overflow: 'hidden' }}
                                >
                                  <LinkPreview
                                    content={content}
                                    parsedLinkData={parsedLinkData}
                                    linkParsing={linkParsing}
                                    isLoading={isLoading}
                                    onContentChange={updateContent}
                                    onParseLink={parseLink}
                                    onClearParsedData={clearParsedData}
                                  />
                                </motion.div>
                              )
                            : (
                                <motion.div
                                  key="media-dropzone"
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{
                                    duration: 0.2,
                                    ease: [0.4, 0, 0.2, 1],
                                    opacity: { duration: 0.2 },
                                    height: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
                                  }}
                                  style={{ overflow: 'hidden' }}
                                >
                                  <MediaDropZone
                                    dragActive={dragActive}
                                    isLoading={isLoading}
                                    selectedFiles={selectedFiles}
                                    previewUrls={previewUrls}
                                    onFileSelect={handleFileSelect}
                                    onDrag={handleDrag}
                                    onDrop={handleDrop}
                                    onRemoveFile={removeFile}
                                    onMoveFile={moveFile}
                                  />
                                </motion.div>
                              )}
                        </AnimatePresence>
                      </div>

                      <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                          key={type === 'audio' ? 'audio-track-toggle' : 'audio-track-toggle-hidden'}
                          className="space-y-2"
                          initial={{ opacity: 0, height: 0 }}
                          animate={type === 'audio' ? { opacity: 1, height: 'auto' } : { opacity: 0, height: 0 }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{
                            duration: 0.2,
                            ease: [0.4, 0, 0.2, 1],
                            opacity: { duration: 0.2 },
                            height: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
                          }}
                          style={{ overflow: 'hidden' }}
                        >
                          {type === 'audio' && (
                            <>
                              <Label htmlFor="makeTrack">Сделать треком</Label>
                              <div className="flex items-center gap-2">
                                <input id="makeTrack" type="checkbox" className="w-4 h-4" checked={makeTrack} onChange={e => setMakeTrack(e.target.checked)} />
                                <span className="text-sm text-muted-foreground">Использовать расширенный плеер, если доступны метаданные</span>
                              </div>
                            </>
                          )}
                        </motion.div>
                      </AnimatePresence>

                      <TagInput
                        tags={tags}
                        currentTag={currentTag}
                        isLoading={isLoading}
                        onCurrentTagChange={updateCurrentTag}
                        onAddTag={addTag}
                        onRemoveTag={removeTag}
                        onKeyDown={handleTagKeyDown}
                      />
                    </motion.div>
                  )}
          </AnimatePresence>

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
                disabled={isSubmitDisabled()}
              >
                {getSubmitButtonText()}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export function AddContentDialog(props: AddContentDialogProps) {
  const { open: isOpen, onOpenChange, onContentAdded, initialTags } = props

  React.useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [isOpen])

  if (!isOpen)
    return null

  return (
    <AddContentProvider
      initialTags={initialTags}
      onSuccess={() => { }}
      onContentAdded={onContentAdded}
    >
      <AddContentDialogContent
        onOpenChange={onOpenChange}
        onContentAdded={onContentAdded}
      />
    </AddContentProvider>
  )
}
