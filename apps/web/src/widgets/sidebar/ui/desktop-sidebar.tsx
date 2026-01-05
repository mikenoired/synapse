import type { NavItem } from './sidebar'
import { cn } from '@synapse/ui/cn'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@synapse/ui/components'
import { ChevronLeft } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SIDEBAR_ANIMATION } from '@/shared/config/animations'
import { useDashboard } from '@/shared/lib/dashboard-context'

export default function DesktopSidebar({ navItems }: { navItems: NavItem[] }) {
  const { isSidebarExpanded, toggleSidebar } = useDashboard()
  const pathname = usePathname()

  return (
    <TooltipProvider delayDuration={0} disableHoverableContent={isSidebarExpanded}>
      <motion.aside
        animate={{ width: isSidebarExpanded ? 256 : 64 }}
        initial={false}
        transition={SIDEBAR_ANIMATION}
        className="h-screen hidden flex-col sm:flex relative"
      >
        <div className="flex h-full flex-col">
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            <div className="flex flex-col gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={toggleSidebar}
                    className="h-10 w-full justify-start transition-all duration-200 rounded-lg pl-2.5 text-muted-foreground hover:text-foreground hover:bg-accent/50 cursor-pointer"
                  >
                    <div className="flex items-center h-10 overflow-hidden w-full">
                      <motion.div
                        initial={false}
                        animate={{ rotate: isSidebarExpanded ? 0 : 180 }}
                        className="flex items-center justify-center size-5 flex-shrink-0"
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                      >
                        <ChevronLeft className="size-5" />
                      </motion.div>
                      <AnimatePresence mode="wait">
                        {isSidebarExpanded && (
                          <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: '100%' }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={SIDEBAR_ANIMATION}
                            className="ml-3 text-sm font-medium whitespace-nowrap overflow-hidden text-left"
                          >
                            {isSidebarExpanded ? 'Collapse' : 'Expand'}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                    <span className="sr-only">
                      {isSidebarExpanded ? 'Collapse' : 'Expand'}
                      {' '}
                      sidebar
                    </span>
                  </button>
                </TooltipTrigger>
                {!isSidebarExpanded && (
                  <TooltipContent side="right" sideOffset={5}>
                    {isSidebarExpanded ? 'Collapse' : 'Expand'}
                  </TooltipContent>
                )}
              </Tooltip>
              {navItems.map(item => (
                <SidebarItem key={item.label} item={item} pathname={pathname} isExpanded={isSidebarExpanded} />
              ))}
            </div>
          </nav>
        </div>
      </motion.aside>
    </TooltipProvider>
  )
}

function SidebarItem({ item, pathname, isExpanded }: { item: NavItem, pathname?: string, isExpanded: boolean }) {
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
      {!isExpanded && (
        <TooltipContent side="right" sideOffset={5}>
          {item.label}
        </TooltipContent>
      )}
    </Tooltip>
  )
}
