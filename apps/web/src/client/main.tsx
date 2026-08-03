import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import {
	createRootRoute,
	createRoute,
	createRouter,
	lazyRouteComponent,
	Outlet,
	RouterProvider,
	useNavigate,
	useParams,
} from "@tanstack/react-router";
import { ThemeProvider } from "next-themes";
import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "react-hot-toast";

import DashboardContent from "@/app/dashboard/dashboard-content";
import { apiClient, unwrap } from "@/shared/api/client";
import type { ContentTags, Graph } from "@/shared/api/contracts";
import { AuthProvider, useAuth } from "@/shared/lib/auth-context";
import { DashboardProvider } from "@/shared/lib/dashboard-context";
import { UserPreferencesProvider } from "@/shared/lib/user-preferences-context";
import { ModalProvider } from "@/widgets/modals/context/modal-context";
import { ModalManager } from "@/widgets/modals/context/modal-manager";
import { SettingsModalController } from "@/widgets/settings-modal/ui/settings-modal-controller";
import Sidebar from "@/widgets/sidebar/ui/sidebar";

import "@/app/globals.css";

const HomePage = lazyRouteComponent(() => import("@/app/page"));
const DashboardClient = lazyRouteComponent(() => import("@/app/dashboard/page.client"));
const GraphClient = lazyRouteComponent(() => import("@/app/dashboard/graph/pageClient"));
const TagClient = lazyRouteComponent(() => import("@/app/dashboard/tag/[id]/page.client"));
const TagsClient = lazyRouteComponent(() => import("@/app/dashboard/tags/page.client"));

const queryClient = new QueryClient({
	defaultOptions: {
		queries: { staleTime: 60_000, gcTime: 300_000, retry: 1, refetchOnWindowFocus: false },
		mutations: { retry: 1 },
	},
});

function Root() {
	return (
		<QueryClientProvider client={queryClient}>
			<AuthProvider>
				<UserPreferencesProvider>
					<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
						<ModalProvider>
							<Outlet />
							<ModalManager />
							<Toaster position="bottom-right" />
						</ModalProvider>
					</ThemeProvider>
				</UserPreferencesProvider>
			</AuthProvider>
		</QueryClientProvider>
	);
}

function DashboardShell() {
	const { user, loading } = useAuth();
	const navigate = useNavigate();
	useEffect(() => {
		if (!loading && !user) void navigate({ to: "/", replace: true });
	}, [loading, navigate, user]);
	if (loading || !user) return null;
	return (
		<DashboardProvider>
			<div className="h-screen min-h-0 flex w-full bg-muted overflow-hidden">
				<Sidebar />
				<DashboardContent>
					<Outlet />
				</DashboardContent>
				<SettingsModalController />
			</div>
		</DashboardProvider>
	);
}

function GraphRoute() {
	const graph = useQuery({ queryKey: ["graph"], queryFn: () => unwrap<Graph>(apiClient.graph.$get()) });
	if (!graph.data) return null;
	return <GraphClient nodes={graph.data.nodes} edges={graph.data.edges} />;
}

function TagsRoute() {
	return <TagsClient initial={undefined} />;
}

function TagRoute() {
	const { id } = useParams({ from: "/dashboard/tag/$id" });
	const tags = useQuery({
		queryKey: ["content", "tags"],
		queryFn: () => unwrap<ContentTags>(apiClient.content.tags.$get()),
	});
	const tag = tags.data?.find((candidate) => candidate.id === id);
	return (
		<TagClient tagId={id} tagTitle={tag?.title ?? ""} initialColor={tag?.color ?? 0} initial={undefined} />
	);
}

const rootRoute = createRootRoute({ component: Root });
const homeRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: HomePage });
const dashboardRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "dashboard",
	component: DashboardShell,
});
const dashboardIndexRoute = createRoute({
	getParentRoute: () => dashboardRoute,
	path: "/",
	component: () => <DashboardClient initial={undefined} />,
});
const tagsRoute = createRoute({ getParentRoute: () => dashboardRoute, path: "tags", component: TagsRoute });
const tagRoute = createRoute({ getParentRoute: () => dashboardRoute, path: "tag/$id", component: TagRoute });
const graphRoute = createRoute({
	getParentRoute: () => dashboardRoute,
	path: "graph",
	component: GraphRoute,
});
const routeTree = rootRoute.addChildren([
	homeRoute,
	dashboardRoute.addChildren([dashboardIndexRoute, tagsRoute, tagRoute, graphRoute]),
]);
const router = createRouter({ routeTree, context: {} });

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<RouterProvider router={router} />
	</StrictMode>
);
