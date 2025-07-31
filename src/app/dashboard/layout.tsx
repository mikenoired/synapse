import Sidebar from '@/components/sidebar';
import { DashboardProvider } from '@/lib/dashboard-context';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
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