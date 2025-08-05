'use client';

import { ThemeToggle } from '@/features/theme-toggle/ui/theme-toggle';
import { useAuth } from '@/shared/lib/auth-context';
import { useDashboard } from '@/shared/lib/dashboard-context';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/ui/tooltip';
import {
  Home,
  LogOut,
  Plus,
  Settings,
  Tag
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback } from 'react';

export default function Sidebar() {
  const { signOut } = useAuth();
  const { setAddDialogOpen } = useDashboard();
  const pathname = usePathname();

  // Предзагрузка AddContentDialog для лучшего UX  
  const preloadAddContentDialog = useCallback(() => {
    import('@/features/add-content/ui/add-content-dialog')
  }, [])

  const navItems = [
    { href: '/dashboard', icon: Home, label: 'Главная' },
    { href: '/dashboard/tags', icon: Tag, label: 'Теги' },
    {
      action: () => setAddDialogOpen(true),
      icon: Plus,
      label: 'Добавить',
      onMouseEnter: preloadAddContentDialog
    },
    { href: '#', icon: Settings, label: 'Настройки' }
  ];

  const renderNavItem = (item: typeof navItems[number], isMobile = false) => {
    const isActive = item.href === pathname;
    const commonClasses = "flex flex-col items-center justify-center gap-1 transition-colors";
    const activeClasses = "text-foreground font-semibold";
    const inactiveClasses = "text-muted-foreground hover:text-foreground";

    if (item.href) {
      return (
        <Link
          key={item.label}
          href={item.href}
          className={cn(commonClasses, isActive ? activeClasses : inactiveClasses, "w-16 text-center", { "pointer-events-none": isActive })}
        >
          <item.icon className="size-6 mx-auto" />
          {isMobile && <span className="text-xs truncate">{item.label}</span>}
        </Link>
      );
    }

    // Action button (Plus)
    const isAddButton = item.label === 'Добавить';

    return (
      <button
        key={item.label}
        onClick={item.action}
        onMouseEnter={item.onMouseEnter}
        aria-label={item.label}
        className={cn(
          commonClasses,
          inactiveClasses,
          isAddButton && isMobile
            ? 'w-16 h-16 -mt-8 rounded-full bg-primary text-primary-foreground shadow-lg focus-visible:ring-2 focus-visible:ring-ring'
            : 'w-16 text-center',
        )}
        style={isAddButton && isMobile ? { position: 'relative', zIndex: 60 } : undefined}
      >
        <item.icon className={cn(isAddButton && isMobile ? 'size-7' : 'size-6', 'mx-auto')} />
        {isMobile && !isAddButton && <span className="text-xs truncate">{item.label}</span>}
      </button>
    );
  };

  return (
    <>
      {/* Mobile: Floating Bottom Nav */}
      <nav className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 border rounded-full bg-background/95 p-2 backdrop-blur sm:hidden">
        <div className="flex justify-between gap-2 mx-auto font-medium">
          {navItems.map(item => renderNavItem(item, true))}
        </div>
      </nav>

      {/* Desktop: Fixed Vertical Sidebar */}
      <aside className="fixed top-0 left-0 z-40 h-screen w-20 hidden flex-col sm:flex">
        <div className="flex h-full flex-col items-center">
          {/* Icons at Bottom */}
          <div className="mt-auto flex flex-col items-center gap-2 py-5">
            <TooltipProvider delayDuration={0}>
              <nav className="flex flex-col items-center gap-2">
                {navItems.map((item) => {
                  const isActive = item.href === pathname;
                  return (
                    <Tooltip key={item.label}>
                      <TooltipTrigger asChild>
                        {item.href ? (
                          <Link
                            href={item.href}
                            className={cn("flex h-12 w-12 items-center justify-center rounded-lg transition-colors",
                              isActive ? "bg-primary/10 text-primary pointer-events-none" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                          >
                            <item.icon className="size-5" />
                          </Link>
                        ) : (
                          <button
                            onClick={item.action}
                            onMouseEnter={item.onMouseEnter}
                            className="flex h-12 w-12 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
                          >
                            <item.icon className="size-5" />
                          </button>
                        )}
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={5}>{item.label}</TooltipContent>
                    </Tooltip>
                  )
                })}
              </nav>

              {/* Separator Margin */}
              <div className="pt-4"></div>

              <div className="flex flex-col items-center gap-2">
                <ThemeToggle />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-lg" onClick={signOut}>
                      <LogOut className="size-5" />
                      <span className="sr-only">Выйти</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={5}>Выйти</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>
        </div>
      </aside>
    </>
  );
} 