'use client'

import { cn } from '@synapse/ui/cn'
import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@synapse/ui/components'
import { Moon, Sun } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { SIDEBAR_ANIMATION } from '@/shared/config/animations'
import { useDashboard } from '@/shared/lib/dashboard-context'

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()
  const { isSidebarExpanded } = useDashboard()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        disabled
        className="h-10 w-full justify-start"
      />
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-full justify-start pl-2.5 cursor-pointer"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
          <Sun className="size-5 flex-shrink-0 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute size-5 flex-shrink-0 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100" />
          <AnimatePresence mode="wait">
            {isSidebarExpanded && (
              <motion.span
                className="ml-3 text-sm font-medium whitespace-nowrap overflow-hidden text-left"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: '100%' }}
                exit={{ opacity: 0, width: 0 }}
                transition={SIDEBAR_ANIMATION}
              >
                {theme === 'light' ? 'Dark theme' : 'Light theme'}
              </motion.span>
            )}
          </AnimatePresence>
          <span className="sr-only">Switch theme</span>
        </Button>
      </TooltipTrigger>
      {!isSidebarExpanded && (
        <TooltipContent side="right" sideOffset={5}>
          Switch theme
        </TooltipContent>
      )}
    </Tooltip>
  )
}
