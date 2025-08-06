import { protectedProcedure, router } from "../trpc";

export const userRouter = router({
  getUser: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase.auth.getUser();
    if (error) throw new Error(error.message);
    return data.user;
  }),
});