import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import type { ReactNode } from "react";

import { Providers } from "@/app/providers";
import { createContext } from "@/server/context";
import { PerformanceMonitor } from "@/shared/lib/performance-monitor";
import { WebVitals } from "@/shared/lib/webvitals";

import "./globals.css";

const nonBureau = localFont({
	src: [
		{ path: "./fonts/NonBureau-Regular.woff2", weight: "400" },
		{ path: "./fonts/NonBureau-Medium.woff2", weight: "500" },
		{ path: "./fonts/NonBureau-SemiBold.woff2", weight: "600" },
		{ path: "./fonts/NonBureau-Bold.woff2", weight: "700" },
	],
	variable: "--font-non-bureau",
});

const geistMono = Geist_Mono({
	subsets: ["latin"],
	variable: "--font-geist-mono",
});

export const metadata: Metadata = {
	title: "Synapse — личный архив",
	description: "Заметки, документы и медиа в одном пространстве",
	keywords: "notes, files, ideas, organization, productivity",
	authors: [{ name: "Mike Vetkal'" }],
	other: {
		"resource-timing": "navigation",
	},
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	viewportFit: "cover",
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "#fafafa" },
		{ media: "(prefers-color-scheme: dark)", color: "#111111" },
	],
};

export default async function RootLayout({ children }: { children: ReactNode }) {
	const { user } = await createContext({});

	return (
		<html lang="ru" className={`${nonBureau.variable} ${geistMono.variable}`} suppressHydrationWarning>
			<head>
				<link rel="preconnect" href="http://localhost:9000" />
				<link rel="dns-prefetch" href="http://localhost:9000" />
				<meta name="color-scheme" content="light dark" />
			</head>
			<body className="font-sans">
				<WebVitals />
				<PerformanceMonitor />
				<Providers initialUser={user}>{children}</Providers>
			</body>
		</html>
	);
}
