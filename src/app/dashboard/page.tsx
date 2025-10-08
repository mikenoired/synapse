'use server'

import { Suspense } from 'react'
import DashboardClient from './page.client'

export default async function DashboardPage() {
  return (
    <Suspense>
      <DashboardClient />
    </Suspense>
  )
}
