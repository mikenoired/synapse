import { createContext } from "./context";
import type { Context } from "./context";
import { appRouter } from "./routers/_app";

export async function getServerCaller(ctx?: Context) {
	ctx ??= await createContext({});
	return appRouter.createCaller(ctx);
}
