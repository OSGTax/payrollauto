import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Employee } from './types'

interface AuthContextType {
  session: Session | null
  employee: Employee | null
  loading: boolean
  signIn: (empId: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadEmployee(email: string) {
    const empId = email.split('@')[0].toUpperCase()
    const { data } = await supabase
      .from('employees')
      .select('*')
      .eq('emp_id', empId)
      .eq('is_active', true)
      .single()
    setEmployee(data)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      if (s?.user?.email) loadEmployee(s.user.email)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (s?.user?.email) {
        loadEmployee(s.user.email)
      } else {
        setEmployee(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(empId: string, password: string): Promise<string | null> {
    const email = `${empId.toLowerCase()}@crew.local`
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return error.message
    return null
  }

  async function signOut() {
    await supabase.auth.signOut()
    setSession(null)
    setEmployee(null)
  }

  return (
    <AuthContext.Provider value={{ session, employee, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
