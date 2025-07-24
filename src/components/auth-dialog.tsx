'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface AuthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'login' | 'register'
  onModeChange: (mode: 'login' | 'register') => void
}

export function AuthDialog({ open, onOpenChange, mode, onModeChange }: AuthDialogProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { signIn, signUp } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      let result
      if (mode === 'login') {
        result = await signIn(email, password)
      } else {
        result = await signUp(email, password)
      }

      if (result.error) {
        alert(result.error.message)
      } else {
        onOpenChange(false)
        setEmail('')
        setPassword('')
        router.push('/dashboard')
      }
    } catch (error) {
      alert('Произошла ошибка')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'login' ? 'Вход в аккаунт' : 'Создание аккаунта'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'login'
              ? 'Введите свои данные для входа в систему'
              : 'Создайте новый аккаунт для начала работы'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="example@mail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div className="flex flex-col space-y-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Загрузка...' : (mode === 'login' ? 'Войти' : 'Зарегистрироваться')}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => onModeChange(mode === 'login' ? 'register' : 'login')}
            >
              {mode === 'login' ? 'Нет аккаунта? Создать' : 'Уже есть аккаунт? Войти'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 