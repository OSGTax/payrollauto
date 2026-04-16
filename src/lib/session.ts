import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';
import type { Employee, Role } from './types';

/**
 * Fetch the current signed-in employee row. Redirects to /login if no session.
 * Returns null only if the auth user has no matching employees row (should never
 * happen — admin creates the employee row before handing out the password).
 */
export async function getCurrentEmployee(): Promise<Employee | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: emp } = await supabase
    .from('employees')
    .select('*')
    .eq('auth_user_id', user.id)
    .eq('active', true)
    .maybeSingle();
  return emp as Employee | null;
}

export async function requireRole(roles: Role[]): Promise<Employee> {
  const emp = await getCurrentEmployee();
  if (!emp) redirect('/login');
  if (!roles.includes(emp.role)) redirect('/');
  return emp;
}
