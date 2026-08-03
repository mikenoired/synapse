import { useLocation, useNavigate, useRouterState } from "@tanstack/react-router";

export function useRouter() {
	const navigate = useNavigate();
	return {
		push: (to: string, _options?: unknown) => navigate({ to }),
		replace: (to: string, _options?: unknown) => navigate({ to, replace: true }),
		back: () => window.history.back(),
		refresh: () => window.location.reload(),
	};
}

export type ReadonlyURLSearchParams = URLSearchParams;

export function usePathname() {
	return useLocation({ select: (location) => location.pathname });
}

export function useSearchParams() {
	const search = useRouterState({ select: (state) => state.location.searchStr });
	return new URLSearchParams(search);
}

export function redirect(to: string): never {
	throw new Error(`redirect(${to}) is only valid in a route loader`);
}
