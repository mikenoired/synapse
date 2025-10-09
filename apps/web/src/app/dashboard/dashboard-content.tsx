'use client'

import type { ReactNode, RefObject } from 'react'
import { motion } from 'framer-motion'

interface DashboardContentProps {
  children: ReactNode
  scrollContainerRef: RefObject<HTMLDivElement | null>
}

export default function DashboardContent({ children, scrollContainerRef }: DashboardContentProps) {
  return (
    <motion.main className="flex-1 h-screen min-h-0 p-4 pl-0">
      <div
        ref={scrollContainerRef}
        className="pb-20 sm:pb-0 overflow-y-auto flex-1 rounded-lg shadow-sm h-full bg-background scrollbar-hide"
        style={{ maxHeight: '100vh', height: '100%' }}
      >
        {children}
      </div>
    </motion.main>
  )
}
