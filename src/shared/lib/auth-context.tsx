'use client'

import type { Session, User } from '@supabase/supabase-js'
import type { ReactNode } from 'react'
import { createClient } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState } from 'react'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey)
  throw new Error('Missing Supabase environment variables')

const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
)

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      // Ensure SSR cookie is set/renewed on initial load if session exists
      if (session?.access_token) {
        fetch('/api/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: session.access_token }),
        }).catch(() => { })
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      // Keep HttpOnly cookie in sync on sign-in/refresh/sign-out
      if (event === 'SIGNED_OUT') {
        fetch('/api/session', { method: 'DELETE' }).catch(() => { })
      }
      else if (session?.access_token && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')) {
        fetch('/api/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: session.access_token }),
        }).catch(() => { })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Periodically refresh access token and renew SSR cookie
  useEffect(() => {
    if (!session)
      return
    const interval = setInterval(async () => {
      try {
        const { data } = await supabase.auth.refreshSession()
        const newToken = data.session?.access_token
        if (newToken) {
          await fetch('/api/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: newToken }),
          })
        }
      }
      catch {
        // ignore
      }
    }, 45 * 60 * 1000) // every 45 minutes
    return () => clearInterval(interval)
  }, [session])

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { error }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (!error && data.session?.access_token) {
      await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: data.session.access_token }),
      })
    }
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    await fetch('/api/session', { method: 'DELETE' })
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
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

export { supabase }
