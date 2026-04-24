import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = await createClient();
  await supabase.from('employees').select('id').limit(1);
  return NextResponse.json({ ok: true });
}
