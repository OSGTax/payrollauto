'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/session';
import { codeToEmail } from '@/lib/auth-email';

function parseForm(form: FormData) {
  const s = (k: string) => {
    const v = form.get(k);
    return v === null || v === '' ? null : String(v);
  };
  return {
    emp_code: s('emp_code')!.toUpperCase(),
    first_name: s('first_name')!,
    last_name: s('last_name')!,
    role: s('role') as 'admin' | 'manager' | 'worker',
    department: s('department'),
    default_class: s('default_class'),
    default_rate: s('default_rate') ? Number(s('default_rate')) : null,
    default_wcomp1: s('default_wcomp1'),
    default_wcomp2: s('default_wcomp2'),
    active: form.get('active') === 'on',
    password: s('password'),
  };
}

export async function saveEmployee(id: string | null, form: FormData) {
  await requireRole(['admin']);
  const p = parseForm(form);
  const admin = adminClient();
  const db = await createClient();

  if (!id) {
    if (!p.password || p.password.length < 8) {
      return { error: 'Password required (min 8 characters) on new employee.' };
    }
    const email = codeToEmail(p.emp_code);
    const { data: userRes, error: userErr } = await admin.auth.admin.createUser({
      email,
      password: p.password,
      email_confirm: true,
    });
    if (userErr) return { error: userErr.message };
    const { error: insErr } = await admin.from('employees').insert({
      auth_user_id: userRes.user!.id,
      emp_code: p.emp_code,
      first_name: p.first_name,
      last_name: p.last_name,
      role: p.role,
      department: p.department,
      default_class: p.default_class,
      default_rate: p.default_rate,
      default_wcomp1: p.default_wcomp1,
      default_wcomp2: p.default_wcomp2,
      active: p.active,
    });
    if (insErr) {
      // Roll back the auth user if the employee insert fails
      await admin.auth.admin.deleteUser(userRes.user!.id);
      return { error: insErr.message };
    }
  } else {
    const { data: existing, error: fetchErr } = await admin
      .from('employees')
      .select('emp_code, auth_user_id')
      .eq('id', id)
      .maybeSingle();
    if (fetchErr) return { error: fetchErr.message };
    if (!existing) return { error: 'Employee not found.' };

    if (p.emp_code !== existing.emp_code && existing.auth_user_id) {
      const { error: emailErr } = await admin.auth.admin.updateUserById(
        existing.auth_user_id,
        { email: codeToEmail(p.emp_code), email_confirm: true },
      );
      if (emailErr) return { error: `Auth email update failed: ${emailErr.message}` };
    }

    const { error } = await db
      .from('employees')
      .update({
        emp_code: p.emp_code,
        first_name: p.first_name,
        last_name: p.last_name,
        role: p.role,
        department: p.department,
        default_class: p.default_class,
        default_rate: p.default_rate,
        default_wcomp1: p.default_wcomp1,
        default_wcomp2: p.default_wcomp2,
        active: p.active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) return { error: error.message };
  }
  revalidatePath('/admin/employees');
  return { ok: true };
}

export async function resetPassword(employeeId: string, newPassword: string) {
  await requireRole(['admin']);
  if (newPassword.length < 8) return { error: 'Password must be at least 8 characters.' };
  const admin = adminClient();
  const { data: emp } = await admin
    .from('employees')
    .select('auth_user_id')
    .eq('id', employeeId)
    .maybeSingle();
  if (!emp?.auth_user_id) return { error: 'Employee has no auth account.' };
  const { error } = await admin.auth.admin.updateUserById(emp.auth_user_id, {
    password: newPassword,
  });
  if (error) return { error: error.message };
  return { ok: true };
}
