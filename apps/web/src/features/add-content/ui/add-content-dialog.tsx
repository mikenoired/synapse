'use client'

import type { Transition } from 'motion/react'
import type { FormEvent, TouchEvent } from 'react'
import { Button, Input, Label, Modal } from '@synapse/ui/components'
import { AnimatePresence, motion } from 'motion/react'
import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useDashboard } from '@/shared/lib/dashboard-context'
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

const baseTransition: Transition = {
  duration: 0.2,
  ease: [0.4, 0, 0.2, 1],
  opacity: { duration: 0.2 },
  height: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
}

function AddContentDialogContent({ onOpenChange, onContentAdded, open }: AddContentDialogProps) {
  const { preloadedFiles, setPreloadedFiles } = useDashboard()
  const [uploading, setUploading] = useState(false)

  const context = useAddContent()

  const { type, title, content, isFullScreen } = context.formState
  const [makeTrack, setMakeTrack] = useState(false)

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
    if (preloadedFiles.length > 0) {
      context.updateType('media')
      context.handleFileSelect(preloadedFiles)
      setPreloadedFiles([])
    }
  }, [preloadedFiles, context.updateType, context.handleFileSelect, setPreloadedFiles])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (type === 'media' && context.selectedFiles.length > 0)
      setUploading(true)

    try {
      let success = false
      if (type === 'audio' && context.selectedFiles.length > 0) {
        setUploading(true)
        const files = await context.uploadFiles(context.selectedFiles, title, context.tags, { makeTrack })
        if (files && files.length > 0) {
          toast.success('Saved')
          success = true
        }
        else {
          toast.error('File isn\'t loaded')
          success = false
        }
      }
      else {
        success = await context.submitContent()
      }
      if (success) {
        context.resetForm()
        onOpenChange(false)
        onContentAdded?.()
      }
    }
    finally {
      setUploading(false)
    }
  }

  const isLoading = context.isSubmitting || uploading

  const getDialogSize = () => {
    if (isFullScreen && type === 'note') {
      return 'w-full h-full max-w-none rounded-none'
    }

    const base = 'max-w-3xl w-[95vw]'
    switch (type) {
      case 'note':
      case 'todo':
        return `${base} h-[90vh]`
      case 'media':
      case 'link':
      default:
        return `${base} max-h-[80vh] h-auto`
    }
  }

  const handleTypeChange = (newType: typeof type) => {
    // TODO: Add confirmation dialogs for unsaved changes
    context.updateType(newType)
  }

  const getSubmitButtonText = () => {
    if (uploading) {
      return `Loading ${context.selectedFiles.length} file...`
    }
    if (context.isSubmitting) {
      return 'Saving...'
    }
    return 'Save'
  }

  const isSubmitDisabled = () => {
    if (isLoading || context.linkParsing)
      return true

    if (type === 'media' || type === 'audio') {
      return context.selectedFiles.length === 0
    }
    if (type === 'link') {
      return !content.trim() || !context.parsedLinkData
    }
    if (type === 'note' || type === 'todo') {
      return false
    }
    return !content.trim()
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      className={getDialogSize()}
    >
      <div
        className="h-full"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <ContentTypeSelector
          type={type}
          onTypeChange={handleTypeChange}
          isFullScreen={isFullScreen}
          onToggleFullScreen={context.toggleFullScreen}
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
                    transition={baseTransition}
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
                      transition={baseTransition}
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
                      transition={baseTransition}
                      style={{ overflow: 'hidden' }}
                      className="flex-1 p-6 space-y-4 overflow-y-auto"
                    >
                      <div className="space-y-2">
                        <Label htmlFor="title">Title (optional)</Label>
                        <Input
                          id="title"
                          placeholder="Enter title..."
                          value={title}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => context.updateTitle(e.target.value)}
                          disabled={isLoading}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="content">
                          {type === 'link' ? 'URL' : type === 'audio' ? 'Audio' : 'Media (image or videos)'}
                        </Label>
                        <AnimatePresence mode="wait" initial={false}>
                          {type === 'link'
                            ? (
                                <motion.div
                                  key="link-preview"
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: '100%' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={baseTransition}
                                  style={{ overflow: 'hidden' }}
                                >
                                  <LinkPreview
                                    content={content}
                                    parsedLinkData={context.parsedLinkData}
                                    linkParsing={context.linkParsing}
                                    isLoading={isLoading}
                                    onContentChange={context.updateContent}
                                    onParseLink={context.parseLink}
                                    onClearParsedData={context.clearParsedData}
                                  />
                                </motion.div>
                              )
                            : (
                                <motion.div
                                  key="media-dropzone"
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: '100%' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={baseTransition}
                                  style={{ overflow: 'hidden' }}
                                >
                                  <MediaDropZone
                                    dragActive={context.dragActive}
                                    isLoading={isLoading}
                                    selectedFiles={context.selectedFiles}
                                    previewUrls={context.previewUrls}
                                    onFileSelect={context.handleFileSelect}
                                    onDrag={context.handleDrag}
                                    onDrop={context.handleDrop}
                                    onRemoveFile={context.removeFile}
                                    onMoveFile={context.moveFile}
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
                          animate={type === 'audio' ? { opacity: 1, height: '100%' } : { opacity: 0, height: 0 }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={baseTransition}
                          style={{ overflow: 'hidden' }}
                        >
                          {type === 'audio' && (
                            <>
                              <Label htmlFor="makeTrack">Save as track</Label>
                              <div className="flex items-center gap-2">
                                <input id="makeTrack" type="checkbox" className="w-4 h-4" checked={makeTrack} onChange={e => setMakeTrack(e.target.checked)} />
                                <span className="text-sm text-muted-foreground">Use extended player if file contains metadata</span>
                              </div>
                            </>
                          )}
                        </motion.div>
                      </AnimatePresence>

                      <TagInput
                        tags={context.tags}
                        currentTag={context.currentTag}
                        isLoading={isLoading}
                        onCurrentTagChange={context.updateCurrentTag}
                        onAddTag={context.addTag}
                        onRemoveTag={context.removeTag}
                        onKeyDown={context.handleTagKeyDown}
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
                Discard
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
    </Modal>
  )
}

export function AddContentDialog(props: AddContentDialogProps) {
  const { open: isOpen, onOpenChange, onContentAdded, initialTags } = props

  return (
    <AddContentProvider
      initialTags={initialTags}
      onSuccess={() => { }}
      onContentAdded={onContentAdded}
    >
      <AddContentDialogContent
        open={isOpen}
        onOpenChange={onOpenChange}
        onContentAdded={onContentAdded}
      />
    </AddContentProvider>
  )
}
