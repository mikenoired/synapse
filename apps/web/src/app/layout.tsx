import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import { Geist } from "next/font/google";
import type { ReactNode } from "react";

import { Providers } from "@/app/providers";
import { PerformanceMonitor } from "@/shared/lib/performance-monitor";
import { WebVitals } from "@/shared/lib/webvitals";

import "./globals.css";

const geistMono = Geist_Mono({
	subsets: ["latin"],
	variable: "--font-geist-mono",
});

const geist = Geist({
	subsets: ["latin"],
	variable: "--font-geist",
	display: "swap",
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

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="ru" className={`${geist.variable} ${geistMono.variable}`} suppressHydrationWarning>
			<head>
				<link rel="preconnect" href="http://localhost:9000" />
				<link rel="dns-prefetch" href="http://localhost:9000" />
				<meta name="color-scheme" content="light dark" />
			</head>
			<body className="font-sans">
				<WebVitals />
				<PerformanceMonitor />
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
