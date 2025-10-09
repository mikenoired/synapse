import type { NavItem } from './sidebar'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, LogOut } from 'lucide-react'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from '@/features/theme-toggle/ui/theme-toggle'
import { SIDEBAR_ANIMATION } from '@/shared/config/animations'
import { useAuth } from '@/shared/lib/auth-context'
import { useDashboard } from '@/shared/lib/dashboard-context'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import LogoIcon from '@/shared/ui/logo'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'

export default function DesktopSidebar({ navItems }: { navItems: NavItem[] }) {
  const { signOut } = useAuth()
  const { theme } = useTheme()
  const { isSidebarExpanded, toggleSidebar } = useDashboard()
  const pathname = usePathname()

  return (
    <motion.aside
      animate={{ width: isSidebarExpanded ? 256 : 64 }}
      initial={false}
      transition={SIDEBAR_ANIMATION}
      className="h-screen hidden flex-col sm:flex relative"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between h-16 px-4">
          <AnimatePresence mode="wait">
            {isSidebarExpanded
              ? (
                  <motion.div
                    key="logo-expanded"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="flex items-center gap-3"
                  >
                    <LogoIcon className="size-8 flex-shrink-0" fill={theme === 'dark' ? '#fff' : '#000'} />
                  </motion.div>
                )
              : (
                  <motion.div
                    key="logo-collapsed"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="flex items-center justify-center w-full"
                  >
                    <LogoIcon className="size-8 flex-shrink-0" fill={theme === 'dark' ? '#fff' : '#000'} />
                  </motion.div>
                )}
          </AnimatePresence>

          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild className="cursor-pointer">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'size-8 flex-shrink-0 transition-all duration-300 hover:opacity-100 ease-in-out',
                    !isSidebarExpanded && 'absolute top-4 opacity-0 left-1/2 -translate-x-1/2',
                  )}
                  onClick={toggleSidebar}
                >
                  <motion.div
                    initial={false}
                    animate={{ rotate: isSidebarExpanded ? 0 : 180 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  >
                    <ChevronLeft className="size-4" />
                  </motion.div>
                  <span className="sr-only">
                    {isSidebarExpanded ? 'Collapse' : 'Expand'}
                    {' '}
                    sidebar
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                sideOffset={5}
                className={cn(
                  'transition-opacity duration-200',
                  isSidebarExpanded && 'opacity-0 pointer-events-none',
                )}
              >
                {isSidebarExpanded ? 'Collapse' : 'Expand'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <TooltipProvider delayDuration={0}>
            <div className="flex flex-col gap-2">
              {navItems.map(item => (
                <SidebarItem key={item.label} item={item} pathname={pathname} isExpanded={isSidebarExpanded} />
              ))}
            </div>
          </TooltipProvider>
        </nav>

        <div className="py-4 px-3">
          <TooltipProvider delayDuration={0}>
            <div className="flex flex-col gap-2">
              <ThemeToggle />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-full justify-start pl-2.5"
                    onClick={signOut}
                  >
                    <LogOut className="size-5 flex-shrink-0" />
                    <AnimatePresence mode="wait">
                      {isSidebarExpanded && (
                        <motion.span
                          className="ml-3 text-sm font-medium whitespace-nowrap overflow-hidden text-left"
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: '100%' }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={SIDEBAR_ANIMATION}
                        >
                          Exit
                        </motion.span>
                      )}
                    </AnimatePresence>
                    <span className="sr-only">Exit</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  sideOffset={5}
                  className={cn(
                    'transition-opacity duration-200',
                    isSidebarExpanded && 'opacity-0 pointer-events-none',
                  )}
                >
                  Exit
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      </div>
    </motion.aside>
  )
}

function SidebarItem({ item, pathname, isExpanded }: { item: NavItem, pathname: string, isExpanded: boolean }) {
  const isActive = item.href === pathname
  const isActionButton = !item.href

  const buttonContent = (
    <div className="flex items-center h-10 overflow-hidden w-full">
      <item.icon className="size-5 flex-shrink-0" aria-hidden="true" />
      <AnimatePresence mode="wait">
        {isExpanded && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: '100%' }}
            exit={{ opacity: 0, width: 0 }}
            transition={SIDEBAR_ANIMATION}
            className="ml-3 text-sm font-medium whitespace-nowrap overflow-hidden text-left"
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )

  const buttonClassName = cn(
    'h-10 w-full justify-start transition-all duration-200 rounded-lg pl-2.5',
    isActive
      ? 'bg-primary text-primary-foreground shadow-sm pointer-events-none font-semibold'
      : isActionButton
        ? 'bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary font-semibold border border-primary/20 pl-[0.55rem]'
        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
  )

  const itemElement = item.href
    ? (
        <Link href={item.href} className={buttonClassName}>
          {buttonContent}
        </Link>
      )
    : (
        <button
          onClick={item.action}
          onMouseEnter={item.onMouseEnter}
          className={cn(buttonClassName, 'cursor-pointer')}
        >
          {buttonContent}
        </button>
      )

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {itemElement}
      </TooltipTrigger>
      <TooltipContent
        side="right"
        sideOffset={5}
        className={cn(
          'transition-opacity duration-200',
          isExpanded && 'opacity-0 pointer-events-none',
        )}
      >
        {item.label}
      </TooltipContent>
    </Tooltip>
  )
}
