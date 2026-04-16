import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentEmployee } from '@/lib/session';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const emp = await getCurrentEmployee();
  if (!emp) return new NextResponse('Unauthorized', { status: 401 });
  const supabase = await createClient();
  const { data: row } = await supabase
    .from('entry_photos')
    .select('storage_path, employee_id')
    .eq('id', id)
    .maybeSingle();
  if (!row) return new NextResponse('Not found', { status: 404 });
  if (row.employee_id !== emp.id && emp.role === 'worker') {
    return new NextResponse('Forbidden', { status: 403 });
  }
  const { data: signed } = await supabase.storage
    .from('photos')
    .createSignedUrl(row.storage_path, 60);
  if (!signed?.signedUrl) return new NextResponse('Not found', { status: 404 });
  return NextResponse.redirect(signed.signedUrl);
}
