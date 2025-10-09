import type { NavItem } from './sidebar'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/shared/lib/utils'

export default function MobileSidebar({ navItems }: { navItems: NavItem[] }) {
  const pathname = usePathname()

  const renderNavItem = (item: NavItem, isMobile = false) => {
    const isActive = item.href === pathname
    const commonClasses = 'flex flex-col items-center justify-center gap-1 transition-colors'
    const activeClasses = 'text-foreground font-semibold'
    const inactiveClasses = 'text-muted-foreground hover:text-foreground'

    if (item.href) {
      return (
        <Link
          key={item.label}
          href={item.href}
          className={cn(commonClasses, isActive ? activeClasses : inactiveClasses, 'w-16 text-center', { 'pointer-events-none': isActive })}
        >
          <item.icon className="size-6 mx-auto" />
          {isMobile && <span className="text-xs truncate">{item.label}</span>}
        </Link>
      )
    }

    const isAddButton = item.label === 'Add'

    return (
      <button
        key={item.label}
        onClick={item.action}
        onMouseEnter={item.onMouseEnter}
        aria-label={item.label}
        className={cn(
          commonClasses,
          isAddButton && isMobile
            ? 'w-16 h-16 -mt-8 rounded-full bg-primary text-primary-foreground shadow-lg focus-visible:ring-2 focus-visible:ring-ring font-semibold'
            : 'w-16 text-center text-primary font-semibold',
        )}
        style={isAddButton && isMobile ? { position: 'relative', zIndex: 60 } : undefined}
      >
        <item.icon className={cn(isAddButton && isMobile ? 'size-7' : 'size-6', 'mx-auto')} />
        {isMobile && !isAddButton && <span className="text-xs truncate">{item.label}</span>}
      </button>
    )
  }

  return (
    <nav className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 border rounded-full bg-background/95 p-2 backdrop-blur-sm sm:hidden">
      <div className="flex justify-between gap-2 mx-auto font-medium">
        {navItems.map(item => renderNavItem(item, true))}
      </div>
    </nav>
  )
}
