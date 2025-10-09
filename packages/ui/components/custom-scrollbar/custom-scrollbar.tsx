'use client'

import { motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'

interface CustomScrollbarProps {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
}

export function CustomScrollbar({ scrollContainerRef }: CustomScrollbarProps) {
  const [scrollHeight, setScrollHeight] = useState(0)
  const [clientHeight, setClientHeight] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const scrollbarHeight = (clientHeight / scrollHeight) * clientHeight
  const scrollbarTop = (scrollTop / scrollHeight) * clientHeight

  const showScrollbar = useCallback(() => {
    setIsVisible(true)
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current)
    }
    if (!isDragging && !isHovering) {
      hideTimeout.current = setTimeout(() => {
        setIsVisible(false)
      }, 1000)
    }
  }, [isDragging, isHovering])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container)
      return

    const updateScrollbar = () => {
      setScrollHeight(container.scrollHeight)
      setClientHeight(container.clientHeight)
      setScrollTop(container.scrollTop)
      setIsVisible(container.scrollHeight > container.clientHeight)
    }

    const handleScroll = () => {
      updateScrollbar()
      showScrollbar()
    }

    updateScrollbar()
    container.addEventListener('scroll', handleScroll)
    window.addEventListener('resize', updateScrollbar)

    const resizeObserver = new ResizeObserver(updateScrollbar)
    resizeObserver.observe(container)

    return () => {
      container.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', updateScrollbar)
      resizeObserver.disconnect()
      if (hideTimeout.current) {
        clearTimeout(hideTimeout.current)
      }
    }
  }, [scrollContainerRef, showScrollbar])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setIsVisible(true)

    const startY = e.clientY
    const startScrollTop = scrollTop

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY
      const scrollRatio = scrollHeight / clientHeight
      const newScrollTop = startScrollTop + deltaY * scrollRatio

      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = Math.max(
          0,
          Math.min(newScrollTop, scrollHeight - clientHeight),
        )
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleTrackClick = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current)
      return

    const rect = e.currentTarget.getBoundingClientRect()
    const clickY = e.clientY - rect.top
    const scrollRatio = scrollHeight / clientHeight
    const newScrollTop = clickY * scrollRatio - (scrollbarHeight / 2) * scrollRatio

    scrollContainerRef.current.scrollTop = Math.max(
      0,
      Math.min(newScrollTop, scrollHeight - clientHeight),
    )
  }

  const handleMouseEnter = () => {
    setIsHovering(true)
    setIsVisible(true)
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current)
    }
  }

  const handleMouseLeave = () => {
    setIsHovering(false)
    if (!isDragging) {
      hideTimeout.current = setTimeout(() => {
        setIsVisible(false)
      }, 1000)
    }
  }

  if (scrollHeight <= clientHeight)
    return null

  return (
    <div
      className="fixed right-0 top-0 bottom-0 w-3 z-50 group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleTrackClick}
    >
      <motion.div
        className={`absolute right-1 rounded-full cursor-pointer ${isDragging || isHovering
          ? 'w-2 bg-primary/60'
          : 'w-1.5 bg-primary/40'
          }`}
        style={{
          height: `${scrollbarHeight}px`,
        }}
        animate={{
          opacity: isVisible ? 1 : 0,
          top: scrollbarTop,
        }}
        transition={{
          opacity: { duration: 0.2 },
          top: { type: 'spring', stiffness: 300, damping: 30 },
          width: { duration: 0.15 },
        }}
        onMouseDown={handleMouseDown}
      />
    </div>
  )
}
