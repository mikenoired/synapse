import type { HTMLAttributes } from 'react'
import { cn } from '@synapse/ui/cn'

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
