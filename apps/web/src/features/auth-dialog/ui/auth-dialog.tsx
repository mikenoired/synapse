'use client'

import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Input, Label } from '@synapse/ui/components'
import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { useAuth } from '@/shared/lib/auth-context'

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
  const { signIn, signUp } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = mode === 'login' ? await signIn(email, password) : await signUp(email, password)

      if (result.error) {
        toast.error(result.error.message)
        setIsLoading(false)
      }
    }
    catch {
      toast.error('Some error')
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === 'login' ? 'Login' : 'Create account'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'login'
              ? 'Write your data for login'
              : 'Create new account for using app'}
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
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
            />
            {mode === 'register' && (
              <p className="text-xs text-muted-foreground">
                Minimum 8 symbols, including up and down case, digitals
              </p>
            )}
          </div>

          <div className="flex flex-col space-y-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Loading...' : (mode === 'login' ? 'Login' : 'Create account')}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => onModeChange(mode === 'login' ? 'register' : 'login')}
            >
              {mode === 'login' ? 'No account? Create a new one' : 'Already registered? Login'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
