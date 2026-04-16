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
  const { error } = await supabase.auth.signInWithPassword({
    email: codeToEmail(code),
    password,
  });
  if (error) {
    redirect('/login?error=' + encodeURIComponent('Invalid code or password'));
  }
  redirect('/');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
