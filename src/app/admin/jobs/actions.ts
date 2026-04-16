'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/session';

export async function saveJob(existing: string | null, form: FormData) {
  await requireRole(['admin']);
  const supabase = await createClient();
  const row = {
    job_code: String(form.get('job_code') ?? '').trim(),
    description: String(form.get('description') ?? '').trim(),
    state: (form.get('state') as string) || null,
    local: (form.get('local') as string) || null,
    default_worktype: Number(form.get('default_worktype') ?? 1),
    active: form.get('active') === 'on',
  };
  if (!row.job_code || !row.description) return { error: 'Code and description required.' };
  const { error } = existing
    ? await supabase.from('jobs').update(row).eq('job_code', existing)
    : await supabase.from('jobs').insert(row);
  if (error) return { error: error.message };
  revalidatePath('/admin/jobs');
  return { ok: true };
}

export async function savePhase(job: string, existing: string | null, code: string, description: string) {
  await requireRole(['admin']);
  const supabase = await createClient();
  if (!code) return { error: 'Phase code required.' };
  const { error } = existing
    ? await supabase
        .from('phases')
        .update({ phase_code: code, description })
        .eq('job_code', job)
        .eq('phase_code', existing)
    : await supabase.from('phases').insert({ job_code: job, phase_code: code, description });
  if (error) return { error: error.message };
  revalidatePath(`/admin/jobs/${job}`);
  return { ok: true };
}

export async function saveCategory(
  job: string,
  phase: string,
  existing: string | null,
  code: string,
  description: string,
) {
  await requireRole(['admin']);
  const supabase = await createClient();
  if (!code) return { error: 'Category code required.' };
  const { error } = existing
    ? await supabase
        .from('categories')
        .update({ cat_code: code, description })
        .eq('job_code', job)
        .eq('phase_code', phase)
        .eq('cat_code', existing)
    : await supabase
        .from('categories')
        .insert({ job_code: job, phase_code: phase, cat_code: code, description });
  if (error) return { error: error.message };
  revalidatePath(`/admin/jobs/${job}`);
  return { ok: true };
}

export async function deletePhase(job: string, phase: string) {
  await requireRole(['admin']);
  const supabase = await createClient();
  const { error } = await supabase.from('phases').delete().eq('job_code', job).eq('phase_code', phase);
  if (error) return { error: error.message };
  revalidatePath(`/admin/jobs/${job}`);
  return { ok: true };
}

export async function deleteCategory(job: string, phase: string, cat: string) {
  await requireRole(['admin']);
  const supabase = await createClient();
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('job_code', job)
    .eq('phase_code', phase)
    .eq('cat_code', cat);
  if (error) return { error: error.message };
  revalidatePath(`/admin/jobs/${job}`);
  return { ok: true };
}

/**
 * Import CSV text. Two supported layouts:
 *   1. Jobs:  job_code,description,state,local
 *   2. Phases+cats:  job,phase,cat,description
 * Header row optional — auto-detected.
 */
export async function importJobsCsv(text: string) {
  await requireRole(['admin']);
  const supabase = await createClient();
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { error: 'Empty input.' };

  const first = lines[0].toLowerCase();
  const isHeader = /job|phase|cat|desc/.test(first);
  const rows = (isHeader ? lines.slice(1) : lines).map((l) => parseCsvLine(l));

  // Detect layout by column count
  const isJobs = rows.every((r) => r.length <= 4);
  const isPhaseCat = rows.every((r) => r.length >= 3) && !isJobs;

  let inserted = 0;
  const errors: string[] = [];

  if (isJobs) {
    for (const r of rows) {
      const [job_code, description, state, local] = r;
      if (!job_code || !description) continue;
      const { error } = await supabase.from('jobs').upsert({
        job_code: job_code.trim(),
        description: description.trim(),
        state: state?.trim() || null,
        local: local?.trim() || null,
      });
      if (error) errors.push(`${job_code}: ${error.message}`);
      else inserted++;
    }
  } else if (isPhaseCat) {
    for (const r of rows) {
      const [job, phase, cat, description] = r;
      if (!job || !phase) continue;
      if (!cat) {
        const { error } = await supabase
          .from('phases')
          .upsert({ job_code: job.trim(), phase_code: phase.trim(), description: description?.trim() ?? '' });
        if (error) errors.push(`${job}/${phase}: ${error.message}`);
        else inserted++;
      } else {
        const { error } = await supabase.from('categories').upsert({
          job_code: job.trim(),
          phase_code: phase.trim(),
          cat_code: cat.trim(),
          description: description?.trim() ?? '',
        });
        if (error) errors.push(`${job}/${phase}/${cat}: ${error.message}`);
        else inserted++;
      }
    }
  } else {
    return { error: 'Could not detect CSV layout.' };
  }

  revalidatePath('/admin/jobs');
  return { inserted, errors: errors.slice(0, 10) };
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') { inQ = false; }
      else cur += c;
    } else {
      if (c === ',') { out.push(cur); cur = ''; }
      else if (c === '"' && cur === '') { inQ = true; }
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}
