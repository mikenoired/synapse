'use client'

import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useState } from 'react'

interface User {
  id: string
  email: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const initAuth = async () => {
      try {
        const response = await fetch('/api/user', {
          credentials: 'include',
        })

        if (response.ok) {
          const data = await response.json()
          if (data.id && data.email) {
            setUser({ id: data.id, email: data.email })
          }
        }
      }
      catch (error) {
        console.error('Auth init error:', error)
      }
      finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [])

  const signUp = async (email: string, password: string) => {
    try {
      const result = await fetch('/api/trpc/auth.register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ json: { email, password } }),
        credentials: 'include',
      }).then(res => res.json())

      if (result.error) {
        return { error: result.error }
      }

      const data = result.result?.data?.json || result.result?.data
      if (!data?.token || !data?.refreshToken) {
        console.error('Invalid response structure:', result)
        return { error: { message: 'Не получены токены авторизации' } }
      }

      const sessionResponse = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: data.token,
          refreshToken: data.refreshToken,
        }),
        credentials: 'include',
      })

      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json().catch(() => ({}))
        console.error('Failed to set session cookies:', errorData)
        return { error: { message: 'Ошибка установки сессии' } }
      }

      setUser({ id: data.user.id, email: data.user.email })
      router.push('/dashboard')
      return { error: null }
    }
    catch (error: any) {
      console.error('Sign up error:', error)
      return { error: { message: error.message || 'Ошибка регистрации' } }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const result = await fetch('/api/trpc/auth.login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ json: { email, password } }),
        credentials: 'include',
      }).then(res => res.json())

      if (result.error) {
        return { error: result.error }
      }

      const data = result.result?.data?.json || result.result?.data
      if (!data?.token || !data?.refreshToken) {
        console.error('Invalid response structure:', result)
        return { error: { message: 'Не получены токены авторизации' } }
      }

      const sessionResponse = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: data.token,
          refreshToken: data.refreshToken,
        }),
        credentials: 'include',
      })

      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json().catch(() => ({}))
        console.error('Failed to set session cookies:', errorData)
        return { error: { message: 'Ошибка установки сессии' } }
      }

      setUser({ id: data.user.id, email: data.user.email })
      router.push('/dashboard')
      return { error: null }
    }
    catch (error: any) {
      console.error('Sign in error:', error)
      return { error: { message: error.message || 'Ошибка входа' } }
    }
  }

  const signOut = async () => {
    try {
      await fetch('/api/session', {
        method: 'DELETE',
        credentials: 'include',
      })
      setUser(null)
      router.push('/')
    }
    catch (error) {
      console.error('Logout error:', error)
      setUser(null)
      router.push('/')
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signUp,
      signIn,
      signOut,
    }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
