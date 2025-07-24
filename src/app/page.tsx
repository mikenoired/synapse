'use client'

import { AuthDialog } from '@/components/auth-dialog'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function HomePage() {
  const [authDialogOpen, setAuthDialogOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const { user, loading } = useAuth()
  const router = useRouter()

  // Перенаправляем авторизованного пользователя на дашборд
  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  const handleAuthClick = (mode: 'login' | 'register') => {
    setAuthMode(mode)
    setAuthDialogOpen(true)
  }

  // Показываем загрузку пока проверяем аутентификацию
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Если пользователь авторизован, покажем заглушку (должно перенаправить)
  if (user) {
    return null
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="text-center space-y-8 max-w-2xl">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Ваш интерактивный
            <span className="block text-primary">мозг</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-lg mx-auto">
            Храните заметки, файлы и идеи в одном месте.
            Организуйте свои мысли с помощью тегов и быстрого поиска.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            onClick={() => handleAuthClick('login')}
            className="min-w-32"
          >
            Войти
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => handleAuthClick('register')}
            className="min-w-32"
          >
            Зарегистрироваться
          </Button>
        </div>
      </div>

      <AuthDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        mode={authMode}
        onModeChange={setAuthMode}
      />
    </main>
  )
}
