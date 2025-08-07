import { ThemeToggle } from "@/features/theme-toggle/ui/theme-toggle";
import { useAuth } from "@/shared/lib/auth-context";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/tooltip";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "./sidebar";

export default function DesktopSidebar({ navItems }: { navItems: NavItem[] }) {
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
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
  )
}