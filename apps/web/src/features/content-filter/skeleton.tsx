import React from 'react'

export function ContentFilterSkeleton() {
  return (
    <div className="space-y-6 sticky top-0 bg-background z-10">
      <div className="animate-pulse bg-muted h-[3.625rem] w-full" />
    </div>
  )
}
