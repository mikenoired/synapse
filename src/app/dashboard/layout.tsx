import { DashboardProvider } from '@/shared/lib/dashboard-context';
import Sidebar from '@/widgets/sidebar/ui/sidebar';
import { ReactNode } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <DashboardProvider>
      <div className="flex min-h-screen w-full flex-col bg-background">
        <Sidebar />
        <main className="sm:pl-15 pb-20 sm:pb-0">{children}</main>
      </div>
    </DashboardProvider>
  );
} 