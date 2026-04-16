'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/session';

type RefTable = 'departments' | 'worker_classes' | 'wcomp_codes';

type Row = {
  code: string;
  description: string;
  default_wcomp1?: string | null;
  default_wcomp2?: string | null;
  active: boolean;
};

export async function saveRef(
  table: RefTable,
  existing: string | null,
  row: Row,
  revalidateRoute: string,
) {
  await requireRole(['admin']);
  const supabase = await createClient();
  const payload: Record<string, unknown> = {
    code: row.code,
    description: row.description,
    active: row.active,
  };
  if (table === 'worker_classes') {
    payload.default_wcomp1 = row.default_wcomp1 ?? null;
    payload.default_wcomp2 = row.default_wcomp2 ?? null;
  }
  const { error } = existing
    ? await supabase.from(table).update(payload).eq('code', existing)
    : await supabase.from(table).insert(payload);
  if (error) return { error: error.message };
  revalidatePath(revalidateRoute);
  return { ok: true };
}

export async function removeRef(
  table: RefTable,
  code: string,
  revalidateRoute: string,
) {
  await requireRole(['admin']);
  const supabase = await createClient();
  const { error } = await supabase.from(table).delete().eq('code', code);
  if (error) return { error: error.message };
  revalidatePath(revalidateRoute);
  return { ok: true };
}
