"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";

export interface User {
	id: string;
	email: string;
}

export interface AuthError {
	message: string;
	fieldErrors?: Partial<Record<"email" | "password", string>>;
}

interface AuthContextType {
	user: User | null;
	loading: boolean;
	signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
	signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
	signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
	children,
	initialUser = null,
}: {
	children: ReactNode;
	initialUser?: User | null;
}) {
	const [user, setUser] = useState<User | null>(initialUser);
	const [loading, setLoading] = useState(initialUser === null);
	const router = useRouter();

	useEffect(() => {
		if (initialUser) return;

		const controller = new AbortController();

		async function loadUser() {
			try {
				const response = await fetch("/api/user", {
					credentials: "include",
					signal: controller.signal,
				});

				if (!response.ok) {
					setUser(null);
					return;
				}

				const nextUser = (await response.json()) as User;
				setUser(nextUser);
			} catch (error) {
				if (error instanceof DOMException && error.name === "AbortError") return;
				setUser(null);
			} finally {
				if (!controller.signal.aborted) setLoading(false);
			}
		}

		void loadUser();

		return () => controller.abort();
	}, [initialUser]);

	const signUp = async (email: string, password: string) => {
		try {
			const result = await fetch("/api/trpc/auth.register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ json: { email, password } }),
				credentials: "include",
			}).then((res) => res.json());

			if (result.error) {
				const error = result.error.json;
				return {
					error: {
						message: error?.message || "Register error",
						fieldErrors: error?.data?.fieldErrors
							? {
									email: error.data.fieldErrors.email?.[0],
									password: error.data.fieldErrors.password?.[0],
								}
							: undefined,
					},
				};
			}

			const data = result.result?.data?.json || result.result?.data;
			if (!data?.token || !data?.refreshToken) {
				return { error: { message: "Can't get tokens" } };
			}

			const sessionResponse = await fetch("/api/session", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					token: data.token,
					refreshToken: data.refreshToken,
				}),
				credentials: "include",
			});

			if (!sessionResponse.ok) {
				return { error: { message: "Session setting error" } };
			}

			setUser({ id: data.user.id, email: data.user.email });
			router.push("/dashboard");
			return { error: null };
		} catch (error) {
			return { error: { message: error instanceof Error ? error.message : "Register error" } };
		}
	};

	const signIn = async (email: string, password: string) => {
		try {
			const result = await fetch("/api/trpc/auth.login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ json: { email, password } }),
				credentials: "include",
			}).then((res) => res.json());

			if (result.error) {
				const error = result.error.json;
				return {
					error: {
						message: error?.message || "Login error",
						fieldErrors: error?.data?.fieldErrors
							? {
									email: error.data.fieldErrors.email?.[0],
									password: error.data.fieldErrors.password?.[0],
								}
							: undefined,
					},
				};
			}

			const data = result.result?.data?.json || result.result?.data;
			if (!data?.token || !data?.refreshToken) {
				return { error: { message: "Can't get register tokens" } };
			}

			const sessionResponse = await fetch("/api/session", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					token: data.token,
					refreshToken: data.refreshToken,
				}),
				credentials: "include",
			});

			if (!sessionResponse.ok) {
				return { error: { message: "Session setting error" } };
			}

			setUser({ id: data.user.id, email: data.user.email });
			router.push("/dashboard");
			return { error: null };
		} catch (error) {
			return { error: { message: error instanceof Error ? error.message : "Login error" } };
		}
	};

	const signOut = async () => {
		try {
			await fetch("/api/session", {
				method: "DELETE",
				credentials: "include",
			});
			setUser(null);
			router.push("/");
		} catch {
			setUser(null);
			router.push("/");
		}
	};

	return (
		<AuthContext.Provider
			value={{
				user,
				loading,
				signUp,
				signIn,
				signOut,
			}}>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
}
