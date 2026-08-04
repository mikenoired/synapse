import { useLocation, useNavigate, useRouterState } from "@tanstack/react-router";

export function useRouter() {
	const navigate = useNavigate();
	return {
		push: (to: string, options?: { state?: any; scroll?: boolean }) =>
			navigate({ to, state: options?.state }),
		replace: (to: string, options?: { state?: any; scroll?: boolean }) =>
			navigate({ to, replace: true, state: options?.state }),
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
