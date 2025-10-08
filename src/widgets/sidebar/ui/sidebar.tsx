'use client'

import type {
  LucideProps,
} from 'lucide-react'
import type { ForwardRefExoticComponent, RefAttributes } from 'react'
import {
  Home,
  Network,
  Plus,
  Settings,
  Tag,
} from 'lucide-react'
import { useCallback } from 'react'
import { useDashboard } from '@/shared/lib/dashboard-context'
import DesktopSidebar from './desktop-sidebar'
import MobileSidebar from './mobile-sidebar'

export type NavItem = {
  href: string
  icon: ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>>
  label: string
  action?: undefined
  onMouseEnter?: undefined
} | {
  action: () => void
  icon: ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>>
  label: string
  onMouseEnter: () => void
  href?: undefined
}

export default function Sidebar() {
  const { openAddDialog } = useDashboard()

  const preloadAddContentDialog = useCallback(() => {
    import('@/features/add-content/ui/add-content-dialog')
  }, [])

  const navItems: NavItem[] = [
    {
      action: () => openAddDialog(),
      icon: Plus,
      label: 'Add',
      onMouseEnter: preloadAddContentDialog,
    },
    { href: '/dashboard', icon: Home, label: 'Main' },
    { href: '/dashboard/tags', icon: Tag, label: 'Tags' },
    { href: '/dashboard/graph', icon: Network, label: 'Graph' },
    { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
  ]

  return (
    <>
      <MobileSidebar navItems={navItems} />
      <DesktopSidebar navItems={navItems} />
    </>
  )
}
