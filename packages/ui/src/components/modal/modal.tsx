'use client'

import type { HTMLMotionProps } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '@synapse/ui/cn'
import { AnimatePresence, motion } from 'motion/react'
import React, { useEffect, useRef, useState } from 'react'

interface ModalProps extends Omit<HTMLMotionProps<'div'>, 'onClick'> {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
  className?: string
}

export function Modal({ open, onOpenChange, children, className, ...props }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      document.body.style.paddingRight = 'var(--removed-body-scroll-bar-size, 0px)'
    }
    else {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }

    return () => {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
  }, [open])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => e.key === 'Escape' && open && onOpenChange(false)

    if (open)
      document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onOpenChange])

  useEffect(() => {
    if (!open || !modalRef.current)
      return

    const modal = modalRef.current
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab')
        return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      }
      else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    modal.addEventListener('keydown', handleTabKey)
    firstElement?.focus()

    return () => modal.removeEventListener('keydown', handleTabKey)
  }, [open])

  if (!mounted)
    return null

  return (
    <AnimatePresence mode="wait">
      {open && (
        <motion.div
          key="modal-wrapper"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: 0.25,
            ease: 'easeOut',
          }}
          onClick={() => onOpenChange(false)}
          {...props}
        >
          <motion.div
            key="modal"
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{
              type: 'spring',
              duration: 0.35,
              bounce: 0.1,
              opacity: { duration: 0.2, delay: 0.05 },
            }}
            className={cn(
              'relative z-10 max-w-4xl max-h-[95vh] m-4 bg-background border border-border shadow-2xl overflow-hidden flex flex-col rounded-lg',
              className,
            )}
            onClick={e => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
