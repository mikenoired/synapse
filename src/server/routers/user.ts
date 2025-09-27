import UserService from '../services/user.service'
import { protectedProcedure, router } from '../trpc'

export const userRouter = router({
  getUser: protectedProcedure.query(async ({ ctx }) => {
    const service = new UserService(ctx)
    return await service.getUser()
  }),
  getStorageUsage: protectedProcedure.query(async ({ ctx }) => {
    const service = new UserService(ctx)
    return await service.getStorageUsage()
  }),
})
