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

async function main() {
  loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const empCode = (process.argv[2] ?? '').toUpperCase();

  if (!url || !serviceKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  if (!empCode) throw new Error('Usage: tsx scripts/delete-employee.ts <EMP_CODE>');

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: emp, error: fetchErr } = await admin
    .from('employees')
    .select('id, emp_code, first_name, last_name, role, auth_user_id')
    .eq('emp_code', empCode)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!emp) {
    console.log(`No employee row with emp_code=${empCode}.`);
  }

  if (emp) {
    const { error: delErr } = await admin.from('employees').delete().eq('id', emp.id);
    if (delErr) throw delErr;
    console.log(`Deleted employees row: ${empCode} (${emp.first_name} ${emp.last_name}, role=${emp.role}).`);
  }

  const email = `${empCode.toLowerCase()}@payroll.local`;
  const { data: authList, error: listErr } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (listErr) throw listErr;
  const matches = authList.users.filter((u) => u.email === email);
  if (matches.length === 0) {
    console.log(`No auth.users row with email=${email}.`);
  }
  for (const u of matches) {
    const { error: authDelErr } = await admin.auth.admin.deleteUser(u.id);
    if (authDelErr) throw authDelErr;
    console.log(`Deleted auth user: ${u.id} (${u.email}).`);
  }

  if (emp?.auth_user_id && !matches.some((u) => u.id === emp.auth_user_id)) {
    const { error } = await admin.auth.admin.deleteUser(emp.auth_user_id);
    if (!error) console.log(`Also deleted stale auth_user_id=${emp.auth_user_id} linked from employees row.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
