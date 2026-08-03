"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { useState } from "react";
import { Toaster } from "react-hot-toast";

import { AuthProvider } from "@/shared/lib/auth-context";
import type { User } from "@/shared/lib/auth-context";
import { UserPreferencesProvider } from "@/shared/lib/user-preferences-context";
import { ModalProvider } from "@/widgets/modals/context/modal-context";
import { ModalManager } from "@/widgets/modals/context/modal-manager";

function QueryProvider({ children }: { children: ReactNode }) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: 60 * 1000, // 1 minute for better performance
						gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
						retry: 1, // Reduce retries for faster failure
						refetchOnWindowFocus: false,
						refetchOnMount: false,
					},
					mutations: {
						retry: 1,
					},
				},
			})
	);

	return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export function Providers({
	children,
	initialUser = null,
}: {
	children: ReactNode;
	initialUser?: User | null;
}) {
	return (
		<AuthProvider initialUser={initialUser}>
			<QueryProvider>
				<UserPreferencesProvider>
					<ThemeProvider
						attribute="class"
						defaultTheme="system"
						enableSystem
						disableTransitionOnChange={false}>
						<ModalProvider>
							{children}
							<ModalManager />
							<Toaster
								position="bottom-right"
								toastOptions={{
									duration: 3000,
									className: "bg-background border border-border text-foreground shadow-lg",
								}}
							/>
						</ModalProvider>
					</ThemeProvider>
				</UserPreferencesProvider>
			</QueryProvider>
		</AuthProvider>
	);
}
