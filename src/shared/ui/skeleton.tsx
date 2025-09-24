import type { HTMLAttributes } from 'react'
import { cn } from '@/shared/lib/utils'

function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse bg-muted', className)}
      {...props}
    />
  )
}

export { Skeleton }
