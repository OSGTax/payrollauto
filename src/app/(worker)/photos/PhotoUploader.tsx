'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Camera } from 'lucide-react';

export function PhotoUploader({ employeeId, empCode }: { employeeId: string; empCode: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [kind, setKind] = useState<'receipt' | 'job'>('job');
  const [caption, setCaption] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    const supabase = createClient();
    const path = `${empCode.toLowerCase()}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const { error: upErr } = await supabase.storage.from('photos').upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (upErr) { setError(upErr.message); return; }
    const { error: insErr } = await supabase.from('entry_photos').insert({
      employee_id: employeeId,
      storage_path: path,
      kind,
      caption: caption || null,
    });
    if (insErr) { setError(insErr.message); return; }
    setCaption('');
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-brand-ink-200 bg-white p-3">
      <div className="flex gap-2 text-sm">
        <label className="flex items-center gap-1">
          <input type="radio" checked={kind === 'job'} onChange={() => setKind('job')} /> Job photo
        </label>
        <label className="flex items-center gap-1">
          <input type="radio" checked={kind === 'receipt'} onChange={() => setKind('receipt')} /> Receipt
        </label>
      </div>
      <input
        type="text"
        placeholder="Caption (optional)"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        className="rounded-lg border border-brand-ink-200 bg-white px-3 py-2 text-sm"
      />
      <label className="flex items-center justify-center gap-2 rounded-lg bg-brand-yellow-400 hover:bg-brand-yellow-500 px-4 py-3 font-medium text-brand-ink-900">
        <Camera size={18} />
        <span>{pending ? 'Uploading…' : 'Take / choose photo'}</span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) startTransition(() => handleFile(f));
          }}
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
