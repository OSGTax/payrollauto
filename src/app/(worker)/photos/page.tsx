import { createClient } from '@/lib/supabase/server';
import { getCurrentEmployee } from '@/lib/session';
import { PhotoUploader } from './PhotoUploader';

export default async function PhotosPage() {
  const emp = await getCurrentEmployee();
  if (!emp) return null;
  const supabase = await createClient();
  const { data: photos } = await supabase
    .from('entry_photos')
    .select('id, storage_path, kind, caption, uploaded_at')
    .eq('employee_id', emp.id)
    .order('uploaded_at', { ascending: false })
    .limit(30);

  return (
    <div className="mx-auto max-w-xl p-4">
      <h1 className="mb-3 text-lg font-semibold">Photos</h1>
      <PhotoUploader employeeId={emp.id} empCode={emp.emp_code} />
      {photos && photos.length > 0 ? (
        <ul className="mt-5 grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <li key={p.id} className="aspect-square overflow-hidden rounded-lg bg-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/photo/${p.id}`} alt={p.caption ?? p.kind} className="h-full w-full object-cover" />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-slate-500">No photos yet.</p>
      )}
    </div>
  );
}
