import { router } from '../trpc'
import { authRouter } from './auth'
import { contentRouter } from './content'
import { userRouter } from './user'

export const appRouter = router({
  auth: authRouter,
  content: contentRouter,
  user: userRouter,
})

export type AppRouter = typeof appRouter 