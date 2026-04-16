'use server';

import { redirect } from 'next/navigation';
import { adminClient } from '@/lib/supabase/admin';
import { codeToEmail } from '@/lib/auth-email';

export async function createFirstAdmin(form: FormData) {
  const admin = adminClient();

  const { count } = await admin
    .from('employees')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'admin');
  if ((count ?? 0) > 0) redirect('/login');

  const emp_code = String(form.get('emp_code') ?? '').trim().toUpperCase();
  const first_name = String(form.get('first_name') ?? '').trim();
  const last_name = String(form.get('last_name') ?? '').trim();
  const password = String(form.get('password') ?? '');

  if (!emp_code || !first_name || !last_name || password.length < 8) {
    redirect('/setup?error=' + encodeURIComponent('Fill all fields; password ≥ 8 chars.'));
  }

  const email = codeToEmail(emp_code);
  const { data: userRes, error: userErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (userErr || !userRes.user) {
    redirect('/setup?error=' + encodeURIComponent(userErr?.message ?? 'Auth creation failed'));
  }

  const { error: insErr } = await admin.from('employees').insert({
    auth_user_id: userRes.user.id,
    emp_code,
    first_name,
    last_name,
    role: 'admin',
    active: true,
  });
  if (insErr) {
    await admin.auth.admin.deleteUser(userRes.user.id);
    redirect('/setup?error=' + encodeURIComponent(insErr.message));
  }

  redirect('/login');
}
