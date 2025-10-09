import type { HTMLAttributes } from 'react'
import { cn } from '../../cn'

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
