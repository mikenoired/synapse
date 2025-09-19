import { router } from '../trpc'
import { authRouter } from './auth'
import { contentRouter } from './content'
import { userRouter } from './user'
import { graphRouter } from './graph'

export const appRouter = router({
  auth: authRouter,
  content: contentRouter,
  user: userRouter,
  graph: graphRouter,
})

export type AppRouter = typeof appRouter 