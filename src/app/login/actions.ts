'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { codeToEmail } from '@/lib/auth-email';

export async function login(form: FormData) {
  const code = String(form.get('code') ?? '').trim();
  const password = String(form.get('password') ?? '');
  if (!code || !password) {
    redirect('/login?error=Missing+code+or+password');
  }
  const supabase = await createClient();
  const email = codeToEmail(code);
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.error('[login] signInWithPassword failed', {
      email,
      code,
      status: error.status,
      name: error.name,
      message: error.message,
    });
    redirect('/login?error=' + encodeURIComponent('Invalid code or password'));
  }
  redirect('/');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
