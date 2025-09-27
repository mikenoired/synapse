import { router } from '../trpc'
import { authRouter } from './auth'
import { contentRouter } from './content'
import { graphRouter } from './graph'
import { uploadRouter } from './upload'
import { userRouter } from './user'

export const appRouter = router({
  auth: authRouter,
  content: contentRouter,
  user: userRouter,
  graph: graphRouter,
  upload: uploadRouter,
})

export type AppRouter = typeof appRouter
