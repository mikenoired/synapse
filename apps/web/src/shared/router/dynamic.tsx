import { lazy, Suspense, type ComponentType, type ComponentProps } from "react";

export default function dynamic<T extends ComponentType<any>>(loader: () => Promise<{ default: T }>) {
	const Component = lazy(loader);
	return (props: ComponentProps<T>) => (
		<Suspense fallback={null}>
			<Component {...props} />
		</Suspense>
	);
}
