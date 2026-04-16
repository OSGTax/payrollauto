import { createClient } from '@/lib/supabase/server';
import { RequestRow } from './RequestRow';

export default async function RequestsPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from('change_requests')
    .select(`
      id, time_entry_id, requested_at, message, voice_text, status, resolution_note,
      requested_by:requested_by ( emp_code, first_name, last_name ),
      entry:time_entry_id ( date, start_time, end_time, hours, job, phase, cat, type )
    `)
    .order('requested_at', { ascending: false });

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Change requests</h1>
      <div className="flex flex-col gap-3">
        {(rows ?? []).map((r) => (
          <RequestRow
            key={r.id}
            row={{
              id: r.id,
              time_entry_id: r.time_entry_id,
              requested_at: r.requested_at,
              message: r.message,
              voice_text: r.voice_text,
              status: r.status,
              resolution_note: r.resolution_note,
              // supabase typings for embedded FK selects return arrays; pick first
              requested_by: Array.isArray(r.requested_by) ? r.requested_by[0] : r.requested_by,
              entry: Array.isArray(r.entry) ? r.entry[0] : r.entry,
            }}
          />
        ))}
        {(rows ?? []).length === 0 && <p className="text-sm text-slate-500">No requests yet.</p>}
      </div>
    </div>
  );
}
