'use client'

import type { ReactNode } from 'react'
import { Button } from '@synapse/ui/components'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AuthDialog } from '@/features/auth-dialog/ui/auth-dialog'
import { useAuth } from '@/shared/lib/auth-context'

interface FeatureHighlightProps {
  title: string
  description: string
  accentGradient: string
  icon: ReactNode
}

const features: FeatureHighlightProps[] = [
  {
    title: 'Smart notes',
    description: 'Create notes with rich editor and fast search',
    accentGradient: 'from-blue-500/10 to-blue-500/5',
    icon: (
      <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
  {
    title: 'Tag system',
    description: 'Organize your content by using tags',
    accentGradient: 'from-green-500/10 to-green-500/5',
    icon: (
      <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
        />
      </svg>
    ),
  },
  {
    title: 'Media files',
    description: 'Save your photo, video and audio with fast preview',
    accentGradient: 'from-purple-500/10 to-purple-500/5',
    icon: (
      <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    title: 'Fast search',
    description: 'Find your content blazingly fast with full-text search',
    accentGradient: 'from-orange-500/10 to-orange-500/5',
    icon: (
      <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    ),
  },
  {
    title: 'Mobile version',
    description: 'Access to your data from any device',
    accentGradient: 'from-pink-500/10 to-pink-500/5',
    icon: (
      <svg className="w-6 h-6 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    title: 'Safe',
    description: 'Your data is secured with modern methods of encrypting',
    accentGradient: 'from-cyan-500/10 to-cyan-500/5',
    icon: (
      <svg className="w-6 h-6 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    ),
  },
]

function FeatureHighlight({ title, description, accentGradient, icon }: FeatureHighlightProps) {
  return (
    <div className="group border border-primary/20 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className={`p-3 bg-gradient-to-br ${accentGradient} w-fit mb-4`}>{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}

export default function HomePage() {
  const [authDialogOpen, setAuthDialogOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user)
      router.push('/(dashboard)')
  }, [user, loading, router])

  const handleAuthClick = (mode: 'login' | 'register') => {
    setAuthMode(mode)
    setAuthDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (user)
    return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-50 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-primary/10 backdrop-blur-sm">
              <Image
                src="/logo.svg"
                alt="Synapse Logo"
                width={24}
                height={24}
                className="invert dark:invert-0"
              />
            </div>
            <Image
              src="/logo-lettering.svg"
              alt="Synapse"
              width={65}
              height={13}
              className="invert dark:invert-0"
            />
          </div>
          {/* <ThemeToggle /> */}
        </div>
      </header>

      {/* Hero Section */}
      <main className="min-h-screen flex flex-col items-center justify-center px-4 pt-20">
        <div className="text-center space-y-12 max-w-4xl mx-auto">
          {/* Logo and Title */}
          <div className="space-y-8">
            <div className="flex justify-center">
              <div className="relative p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 backdrop-blur-sm border border-primary/20">
                <Image
                  src="/logo.svg"
                  alt="Synapse Logo"
                  width={80}
                  height={80}
                  className="invert dark:invert-0 animate-pulse"
                />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-transparent opacity-50 animate-pulse"></div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex justify-center">
                <Image
                  src="/logo-lettering.svg"
                  alt="Synapse"
                  width={260}
                  height={52}
                  className="invert dark:invert-0 hover:scale-105 transition-transform duration-300"
                />
              </div>
              <p className="text-2xl md:text-3xl font-medium text-muted-foreground">
                Your interactive
                {' '}
                <span className="text-primary font-bold">mind</span>
              </p>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Store your photo, video, notes in one place.
                Organize your minds with tags and fast search.
              </p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => handleAuthClick('login')}
              className="min-w-40 h-12 text-lg font-medium transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Login
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleAuthClick('register')}
              className="min-w-40 h-12 text-lg font-medium border-2 transition-all duration-300"
            >
              Register
            </Button>
          </div>
        </div>
      </main>

      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <div className="flex items-center justify-center gap-4">
              <h2 className="text-3xl md:text-4xl font-bold">Features</h2>
              <Image
                src="/logo-lettering.svg"
                alt="Synapse"
                width={130}
                height={26}
                className="invert dark:invert-0"
              />
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Useful tools for storage organizing
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map(feature => (
              <FeatureHighlight key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <h2 className="text-3xl md:text-4xl font-bold">Are you ready to go with</h2>
            <Image
              src="/logo-lettering.svg"
              alt="Synapse"
              width={130}
              height={30}
              className="invert dark:invert-0"
            />
            <span className="text-3xl md:text-4xl font-bold">?</span>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join with thousands of users who already organized their information with Synapse
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => handleAuthClick('register')}
              className="min-w-48 h-12 text-lg font-medium transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Continue free
            </Button>
          </div>
        </div>
      </section>

      <AuthDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        mode={authMode}
        onModeChange={setAuthMode}
      />
    </div>
  )
}
