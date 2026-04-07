import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";

import { Providers } from "@/app/providers";
import { createContext } from "@/server/context";
import { PerformanceMonitor } from "@/shared/lib/performance-monitor";
import { WebVitals } from "@/shared/lib/webvitals";

import "./globals.css";

const geistSans = Geist({
	subsets: ["latin"],
	variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
	subsets: ["latin"],
	variable: "--font-geist-mono",
});

export const metadata: Metadata = {
	title: "Synapse - Your interactive mind",
	description: "App for media and notes management",
	keywords: "notes, files, ideas, organization, productivity",
	authors: [{ name: "Mike Vetkal'" }],
	other: {
		"resource-timing": "navigation",
	},
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	viewportFit: "contain",
};


export default async function RootLayout({ children }: { children: ReactNode }) {
	const { user } = await createContext({});

	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<link rel="preconnect" href="http://localhost:9000" />
				<link rel="dns-prefetch" href="http://localhost:9000" />
				<meta name="theme-color" content="#ffffff" />
				<meta name="color-scheme" content="light dark" />
			</head>
			<body className={`${geistSans.variable} ${geistMono.variable} font-sans`}>
				<WebVitals />
				<PerformanceMonitor />
				<Providers initialUser={user}>{children}</Providers>
			</body>
		</html>
	);
}
