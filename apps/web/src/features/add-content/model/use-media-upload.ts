import type { DragEvent } from 'react'
import type { MediaState } from './types'
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { getVideoThumbnail } from '../utils'

export function useMediaUpload() {
  const [state, setState] = useState<MediaState>({
    selectedFiles: [],
    previewUrls: [],
    dragActive: false,
  })

  useEffect(() => {
    return () => {
      state.previewUrls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [state.previewUrls])

  const handleFileSelect = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const validFiles: File[] = []
    const previewPromises: Promise<string>[] = []

    for (const file of fileArray) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File "${file.name}" is too big (max 10MB)`)
        continue
      }
      if (!(file.type.startsWith('image/') || file.type.startsWith('video/') || file.type.startsWith('audio/'))) {
        toast.error(`File "${file.name}" isn't supporting (image, video or audio)`)
        continue
      }
      validFiles.push(file)
      if (file.type.startsWith('image/')) {
        previewPromises.push(Promise.resolve(URL.createObjectURL(file)))
      }
      else if (file.type.startsWith('video/')) {
        previewPromises.push(getVideoThumbnail(file))
      }
      else if (file.type.startsWith('audio/')) {
        previewPromises.push(Promise.resolve(''))
      }
    }

    if (validFiles.length > 0) {
      state.previewUrls.forEach(url => URL.revokeObjectURL(url))
      const newPreviewUrls = await Promise.all(previewPromises)
      setState({
        selectedFiles: validFiles,
        previewUrls: newPreviewUrls,
        dragActive: false,
      })
    }
  }, [state.previewUrls])

  const removeFile = useCallback((index: number) => {
    const newFiles = state.selectedFiles.filter((_, i) => i !== index)
    const newUrls = state.previewUrls.filter((_, i) => i !== index)

    URL.revokeObjectURL(state.previewUrls[index])

    setState(prev => ({
      ...prev,
      selectedFiles: newFiles,
      previewUrls: newUrls,
    }))
  }, [state.selectedFiles, state.previewUrls])

  const moveFile = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex)
      return

    const newFiles = [...state.selectedFiles]
    const newUrls = [...state.previewUrls]

    const [movedFile] = newFiles.splice(fromIndex, 1)
    const [movedUrl] = newUrls.splice(fromIndex, 1)

    newFiles.splice(toIndex, 0, movedFile)
    newUrls.splice(toIndex, 0, movedUrl)

    setState(prev => ({
      ...prev,
      selectedFiles: newFiles,
      previewUrls: newUrls,
    }))
  }, [state.selectedFiles, state.previewUrls])

  const handleDrag = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setState(prev => ({ ...prev, dragActive: true }))
    }
    else if (e.type === 'dragleave') {
      setState(prev => ({ ...prev, dragActive: false }))
    }
  }, [])

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setState(prev => ({ ...prev, dragActive: false }))

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files)
    }
  }, [handleFileSelect])

  const resetMedia = useCallback(() => {
    state.previewUrls.forEach(url => URL.revokeObjectURL(url))
    setState({
      selectedFiles: [],
      previewUrls: [],
      dragActive: false,
    })
  }, [state.previewUrls])

  return {
    ...state,
    handleFileSelect,
    removeFile,
    moveFile,
    handleDrag,
    handleDrop,
    resetMedia,
  }
}
