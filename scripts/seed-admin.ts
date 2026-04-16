import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnv() {
  try {
    const txt = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
    for (const line of txt.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {}
}
loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const empCode = (process.env.SEED_ADMIN_CODE ?? 'ADMIN').toUpperCase();
const password = process.env.SEED_ADMIN_PASSWORD;
const first = process.env.SEED_ADMIN_FIRST ?? 'Admin';
const last = process.env.SEED_ADMIN_LAST ?? 'User';

if (!url || !serviceKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
if (!password) throw new Error('Set SEED_ADMIN_PASSWORD in env before running');

const email = `${empCode.toLowerCase()}@payroll.local`;
const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const { data: existing } = await admin.from('employees').select('id').eq('emp_code', empCode).maybeSingle();
if (existing) {
  console.log(`Employee ${empCode} already exists (id=${existing.id}).`);
  process.exit(0);
}

const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});
if (createErr || !created.user) throw createErr ?? new Error('createUser returned no user');

const { error: insertErr } = await admin.from('employees').insert({
  emp_code: empCode,
  first_name: first,
  last_name: last,
  role: 'admin',
  auth_user_id: created.user.id,
  active: true,
});
if (insertErr) {
  await admin.auth.admin.deleteUser(created.user.id);
  throw insertErr;
}

console.log(`Created admin ${empCode}. Log in with username "${empCode}" and the password you set.`);
