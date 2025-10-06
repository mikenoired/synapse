import type { ReactNode } from 'react'
import { DashboardProvider } from '@/shared/lib/dashboard-context'
import Sidebar from '@/widgets/sidebar/ui/sidebar'
import DashboardWrapper from './dashboard-wrapper'

export default function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <DashboardProvider>
      <div className="h-screen min-h-0 flex w-full bg-muted overflow-hidden">
        <Sidebar />
        <DashboardWrapper>{children}</DashboardWrapper>
      </div>
    </DashboardProvider>
  )
}
