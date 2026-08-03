"use client";

import { Button } from "@synapse/ui/components";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { AuthDialog } from "@/features/auth-dialog/ui/auth-dialog";
import { useAuth } from "@/shared/lib/auth-context";
import Image from "@/shared/router/image";
import { useRouter } from "@/shared/router/navigation";

interface FeatureHighlightProps {
	title: string;
	description: string;
	icon: ReactNode;
}

const features: FeatureHighlightProps[] = [
	{
		title: "Заметки и документы",
		description: "Храните мысли, статьи и файлы рядом — без переключения между сервисами.",
		icon: (
			<svg className="size-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2}
					d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
				/>
			</svg>
		),
	},
	{
		title: "Связи через теги",
		description: "Собирайте материалы по темам и находите связанные идеи в несколько кликов.",
		icon: (
			<svg className="size-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2}
					d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
				/>
			</svg>
		),
	},
	{
		title: "Медиа под рукой",
		description: "Сохраняйте изображения, видео и аудио с быстрым просмотром прямо в архиве.",
		icon: (
			<svg className="size-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2}
					d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
				/>
			</svg>
		),
	},
];

function FeatureHighlight({ title, description, icon }: FeatureHighlightProps) {
	return (
		<div className="group rounded-xl border bg-card p-6 transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/40">
			<div className="mb-4 w-fit rounded-lg bg-primary/10 p-3">{icon}</div>
			<h3 className="text-xl font-semibold mb-2">{title}</h3>
			<p className="text-muted-foreground leading-relaxed">{description}</p>
		</div>
	);
}

export default function HomePage() {
	const [authDialogOpen, setAuthDialogOpen] = useState(false);
	const [authMode, setAuthMode] = useState<"login" | "register">("login");
	const { user, loading } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (!loading && user) router.push("/dashboard");
	}, [user, loading, router]);

	const handleAuthClick = (mode: "login" | "register") => {
		setAuthMode(mode);
		setAuthDialogOpen(true);
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
			</div>
		);
	}

	if (user) return null;

	return (
		<div className="min-h-screen bg-background">
			{/* Header */}
			<header className="absolute top-0 left-0 right-0 z-50 px-6 py-4">
				<div className="flex items-center justify-between max-w-7xl mx-auto">
					<div className="flex items-center space-x-3">
						<div className="p-2 rounded-xl bg-primary/10 backdrop-blur-sm">
							<Image src="/logo.svg" alt="" width={30} height={28} className="invert dark:invert-0" />
						</div>
						<Image
							src="/logo-lettering.svg"
							alt="Synapse"
							width={65}
							height={13}
							className="invert dark:invert-0"
						/>
					</div>
				</div>
			</header>

			{/* Hero Section */}
			<main className="min-h-[88svh] flex flex-col items-center justify-center px-4 pt-24">
				<div className="text-center space-y-10 max-w-4xl mx-auto">
					{/* Logo and Title */}
					<div className="space-y-8">
						<div className="flex justify-center">
							<div className="relative p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 backdrop-blur-sm border border-primary/20">
								<Image src="/logo.svg" alt="" width={75} height={70} className="invert dark:invert-0" />
							</div>
						</div>

						<div className="space-y-6">
							<p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Личный архив</p>
							<h1 className="text-balance text-4xl font-semibold leading-tight sm:text-6xl">
								Всё важное — в одном пространстве
							</h1>
							<p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
								Сохраняйте заметки, документы и медиа. Связывайте их тегами и находите нужное без долгих
								поисков.
							</p>
						</div>
					</div>

					{/* CTA Buttons */}
					<div className="flex flex-col sm:flex-row gap-4 justify-center">
						<Button
							size="lg"
							onClick={() => handleAuthClick("login")}
							className="min-w-40 h-12 text-lg font-medium transition-all duration-300 shadow-lg hover:shadow-xl">
							Войти
						</Button>
						<Button
							variant="tertiary"
							size="lg"
							onClick={() => handleAuthClick("register")}
							className="min-w-40 h-12 text-lg font-medium border-2 transition-all duration-300">
							Создать аккаунт
						</Button>
					</div>
				</div>
			</main>

			<section className="py-20 px-4">
				<div className="max-w-6xl mx-auto">
					<div className="text-center space-y-4 mb-16">
						<div className="flex items-center justify-center gap-4">
							<h2 className="text-3xl md:text-4xl font-bold">Ваши материалы остаются связанными</h2>
						</div>
						<p className="text-lg text-muted-foreground max-w-2xl mx-auto">
							Synapse объединяет разные форматы в один понятный рабочий процесс.
						</p>
					</div>

					<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
						{features.map((feature) => (
							<FeatureHighlight key={feature.title} {...feature} />
						))}
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="py-20 px-4 bg-gradient-to-r from-primary/5 to-primary/10">
				<div className="max-w-4xl mx-auto text-center space-y-8">
					<h2 className="text-3xl md:text-4xl font-bold">Начните с первого материала</h2>
					<p className="text-lg text-muted-foreground max-w-2xl mx-auto">
						Создайте заметку или загрузите файл — структуру можно выстроить позже.
					</p>
					<div className="flex flex-col sm:flex-row gap-4 justify-center">
						<Button
							size="lg"
							onClick={() => handleAuthClick("register")}
							className="min-w-48 h-12 text-lg font-medium transition-all duration-300 shadow-lg hover:shadow-xl">
							Создать аккаунт
						</Button>
					</div>
				</div>
			</section>

			<AuthDialog
				open={authDialogOpen}
				onOpenChange={setAuthDialogOpen}
				mode={authMode}
				onModeChange={setAuthMode}
			/>
		</div>
	);
}
