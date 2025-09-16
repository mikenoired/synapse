"use client"

import { AnimatePresence, motion } from "motion/react"
import { useEffect, useRef, useState, type ReactNode } from "react"

interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}

export default function Modal({ open, onOpenChange, children }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      document.body.style.paddingRight = 'var(--removed-body-scroll-bar-size, 0px)'
    } else {
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

    if (open) document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onOpenChange])

  useEffect(() => {
    if (!open || !modalRef.current) return

    const modal = modalRef.current
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
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

  if (!mounted) return null

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />

          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0.1 }}
            className="relative z-10 w-full max-w-4xl max-h-[95vh] m-4 bg-background border border-border shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}