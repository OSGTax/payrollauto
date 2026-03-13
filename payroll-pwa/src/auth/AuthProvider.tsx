import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../db/supabase';
import type { Employee } from '../db/types';

interface AuthState {
  employee: Employee | null;
  loading: boolean;
  login: (empId: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  employee: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadEmployee(session.user.email?.replace('@crew.local', '') || '');
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadEmployee(session.user.email?.replace('@crew.local', '') || '');
      } else {
        setEmployee(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadEmployee(empId: string) {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .ilike('emp_id', empId)
        .single();
      if (error) throw error;
      setEmployee(data as Employee);
    } catch (err) {
      console.error('Failed to load employee:', err);
      setEmployee(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(empId: string, pin: string) {
    // Use emp_id@crew.local as email, PIN as password
    const email = `${empId.toLowerCase()}@crew.local`;
    const { error } = await supabase.auth.signInWithPassword({ email, password: pin });
    if (error) throw new Error('Invalid Employee ID or PIN');
  }

  async function logout() {
    await supabase.auth.signOut();
    setEmployee(null);
  }

  return (
    <AuthContext.Provider value={{ employee, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
