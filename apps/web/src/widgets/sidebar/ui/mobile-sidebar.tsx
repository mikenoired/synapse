import { cn } from "@synapse/ui/cn";

import Link from "@/shared/router/link";
import { usePathname } from "@/shared/router/navigation";

import type { NavItem } from "./sidebar";

export default function MobileSidebar({ navItems }: { navItems: NavItem[] }) {
	const pathname = usePathname();

	const renderNavItem = (item: NavItem, isMobile = false) => {
		const isActive = item.isActive ?? item.href === pathname;
		const commonClasses = "flex flex-col items-center justify-center gap-1 transition-colors";
		const activeClasses = "text-foreground font-semibold";
		const inactiveClasses = "text-muted-foreground hover:text-foreground";

		if (item.href) {
			return (
				<Link
					key={item.label}
					href={item.href}
					scroll={false}
					className={cn(
						commonClasses,
						isActive ? activeClasses : inactiveClasses,
						"min-w-0 flex-1 text-center",
						{
							"pointer-events-none": isActive,
						}
					)}>
					<item.icon className="mx-auto size-6" />
					{isMobile && <span className="truncate text-xs">{item.label}</span>}
				</Link>
			);
		}

		const isAddButton = !item.href;

		return (
			<button
				key={item.label}
				onClick={item.action}
				onMouseEnter={item.onMouseEnter}
				aria-label={item.label}
				className={cn(
					commonClasses,
					isAddButton && isMobile
						? "-mt-8 h-16 min-w-0 flex-1 rounded-full bg-primary font-semibold text-primary-foreground shadow-lg focus-visible:ring-2 focus-visible:ring-ring"
						: "min-w-0 flex-1 text-center font-semibold text-primary"
				)}
				style={isAddButton && isMobile ? { position: "relative", zIndex: 60 } : undefined}>
				<item.icon className={cn(isAddButton && isMobile ? "size-7" : "size-6", "mx-auto")} />
				{isMobile && !isAddButton && <span className="truncate text-xs">{item.label}</span>}
			</button>
		);
	};

	return (
		<nav className="fixed right-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 z-50 rounded-full border bg-background/95 p-2 backdrop-blur-sm sm:hidden">
			<div className="mx-auto flex max-w-sm justify-between gap-1 font-medium">
				{navItems.map((item) => renderNavItem(item, true))}
			</div>
		</nav>
	);
}
