"use client";

import { Button, Input, Label, Modal } from "@synapse/ui/components";
import { useState } from "react";
import { toast } from "react-hot-toast";

import { useAuth } from "@/shared/lib/auth-context";
import { authSchema } from "@/shared/lib/schemas";

interface AuthDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mode: "login" | "register";
	onModeChange: (mode: "login" | "register") => void;
}

export function AuthDialog({ open, onOpenChange, mode, onModeChange }: AuthDialogProps) {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [fieldErrors, setFieldErrors] = useState<Partial<Record<"email" | "password", string>>>({});
	const { signIn, signUp } = useAuth();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const validation = authSchema.safeParse({ email, password });

		if (!validation.success) {
			const errors = validation.error.flatten().fieldErrors;
			setFieldErrors({ email: errors.email?.[0], password: errors.password?.[0] });
			return;
		}

		setFieldErrors({});
		setIsLoading(true);

		try {
			const result = mode === "login" ? await signIn(email, password) : await signUp(email, password);

			if (result.error) {
				if (result.error.fieldErrors) setFieldErrors(result.error.fieldErrors);
				else toast.error(result.error.message);
			}
		} catch {
			toast.error("Some error");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Modal open={open} onOpenChange={onOpenChange} className="p-4 w-full max-w-md">
			<div className="space-y-1 mb-4">
				<h1 className="text-2xl font-bold">{mode === "login" ? "Login" : "Create account"}</h1>
				<div className="text-muted-foreground">
					{mode === "login" ? "Write your data for login" : "Create new account for using app"}
				</div>
			</div>

			<form onSubmit={handleSubmit} className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="email">Email</Label>
					<Input
						id="email"
						type="email"
						placeholder="example@mail.com"
						value={email}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
							setEmail(e.target.value);
							setFieldErrors((errors) => ({ ...errors, email: undefined }));
						}}
						aria-invalid={Boolean(fieldErrors.email)}
						aria-describedby={fieldErrors.email ? "email-error" : undefined}
						required
					/>
					{fieldErrors.email && (
						<p id="email-error" role="alert" className="text-xs text-destructive">
							{fieldErrors.email}
						</p>
					)}
				</div>

				<div className="space-y-2">
					<Label htmlFor="password">Password</Label>
					<Input
						id="password"
						type="password"
						placeholder="••••••••"
						value={password}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
							setPassword(e.target.value);
							setFieldErrors((errors) => ({ ...errors, password: undefined }));
						}}
						aria-invalid={Boolean(fieldErrors.password)}
						aria-describedby={fieldErrors.password ? "password-error" : undefined}
						required
						minLength={8}
					/>
					{fieldErrors.password ? (
						<p id="password-error" role="alert" className="text-xs text-destructive">
							{fieldErrors.password}
						</p>
					) : mode === "register" ? (
						<p className="text-xs text-muted-foreground">
							Minimum 8 symbols, including up and down case, digitals
						</p>
					) : null}
				</div>

				<div className="flex flex-col space-y-2">
					<Button type="submit" disabled={isLoading}>
						{isLoading ? "Loading..." : mode === "login" ? "Login" : "Create account"}
					</Button>

					<Button
						type="button"
						variant="ghost"
						onClick={() => {
							setFieldErrors({});
							onModeChange(mode === "login" ? "register" : "login");
						}}>
						{mode === "login" ? "No account? Create a new one" : "Already registered? Login"}
					</Button>
				</div>
			</form>
		</Modal>
	);
}
