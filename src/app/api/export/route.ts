import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/session';
import { serialize, rowFromEntry, type Delimiter } from '@/lib/computerease';
import { splitOvertime } from '@/lib/overtime';
import type { TimeEntry } from '@/lib/types';

export async function GET(req: Request) {
  await requireRole(['admin']);
  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const format = (url.searchParams.get('format') ?? 'comma') as Delimiter;
  const onlyApproved = url.searchParams.get('onlyApproved') !== 'false';
  const markExported = url.searchParams.get('markExported') !== 'false';
  if (!from || !to) return new NextResponse('from and to required', { status: 400 });

  const supabase = await createClient();
  let q = supabase
    .from('time_entries')
    .select(`
      id, employee_id, date, start_time, end_time, hours, type, otmult,
      job, phase, cat, class, department, worktype, wcomp1, wcomp2, rate,
      notes, status,
      employees:employee_id ( emp_code )
    `)
    .gte('date', from)
    .lte('date', to)
    .order('date')
    .order('start_time');
  if (onlyApproved) q = q.eq('status', 'approved');
  const { data, error } = await q;
  if (error) return new NextResponse(error.message, { status: 500 });

  // Weekly OT split per employee. Group by employee, split, then flatten.
  const byEmp = new Map<string, (TimeEntry & { emp_code: string })[]>();
  for (const r of data ?? []) {
    const emp = Array.isArray(r.employees) ? r.employees[0] : r.employees;
    const empCode = emp?.emp_code ?? '';
    const arr = byEmp.get(r.employee_id) ?? [];
    arr.push({ ...(r as unknown as TimeEntry), emp_code: empCode });
    byEmp.set(r.employee_id, arr);
  }

  const ceRows = [];
  for (const entries of byEmp.values()) {
    const split = splitOvertime(entries);
    for (const e of split) {
      const empCode = (e as unknown as { emp_code: string }).emp_code;
      ceRows.push(rowFromEntry(e, empCode));
    }
  }

  const body = serialize(ceRows, format);

  if (markExported && (data?.length ?? 0) > 0) {
    await supabase
      .from('time_entries')
      .update({ status: 'exported', exported_at: new Date().toISOString() })
      .in('id', (data ?? []).map((r) => r.id));
  }

  const contentType = format === 'tab' ? 'text/tab-separated-values' : 'text/csv';
  const ext = format === 'tab' ? 'tsv' : format === 'fixed' ? 'txt' : 'csv';
  const filename = `payroll_${from}_to_${to}.${ext}`;
  return new NextResponse(body, {
    headers: {
      'Content-Type': `${contentType}; charset=utf-8`,
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
