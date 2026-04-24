'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';
import { Camera, X } from 'lucide-react';

type Staged = { file: File; previewUrl: string };

export function PhotoUploader({ employeeId, empCode }: { employeeId: string; empCode: string }) {
  const router = useRouter();
  const toast = useToast();
  const [kind, setKind] = useState<'receipt' | 'job'>('job');
  const [caption, setCaption] = useState('');
  const [staged, setStaged] = useState<Staged | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  // Clean up the preview object URL when it changes or unmounts.
  useEffect(() => {
    if (!staged) return;
    return () => URL.revokeObjectURL(staged.previewUrl);
  }, [staged]);

  function selectFile(file: File | null) {
    if (!file) return;
    if (staged) URL.revokeObjectURL(staged.previewUrl);
    setStaged({ file, previewUrl: URL.createObjectURL(file) });
    setProgress(null);
  }

  function clearStaged() {
    if (staged) URL.revokeObjectURL(staged.previewUrl);
    setStaged(null);
    setProgress(null);
  }

  async function upload() {
    if (!staged) return;
    const { file } = staged;
    setUploading(true);
    setProgress(5);
    const supabase = createClient();
    const path = `${empCode.toLowerCase()}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    // supabase-js v2 doesn't expose upload progress events, so we fake a monotonic
    // progress bar that stops just short of 100% and resolves on completion.
    const fakeId = window.setInterval(() => {
      setProgress((p) => (p === null ? null : Math.min(92, p + 7)));
    }, 180);

    const { error: upErr } = await supabase.storage
      .from('photos')
      .upload(path, file, { contentType: file.type, upsert: false });

    window.clearInterval(fakeId);

    if (upErr) {
      setUploading(false);
      setProgress(null);
      toast.error('Upload failed', upErr.message);
      return;
    }

    setProgress(96);
    const { error: insErr } = await supabase.from('entry_photos').insert({
      employee_id: employeeId,
      storage_path: path,
      kind,
      caption: caption || null,
    });
    if (insErr) {
      setUploading(false);
      setProgress(null);
      toast.error('Saved photo but metadata failed', insErr.message);
      return;
    }

    setProgress(100);
    toast.success('Photo uploaded', caption || (kind === 'job' ? 'Job photo' : 'Receipt'));
    setCaption('');
    clearStaged();
    setUploading(false);
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

      {staged ? (
        <div className="flex flex-col gap-2">
          <div className="relative overflow-hidden rounded-lg border border-brand-ink-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={staged.previewUrl} alt="Preview" className="max-h-72 w-full object-cover" />
            {!uploading && (
              <button
                type="button"
                onClick={clearStaged}
                aria-label="Remove photo"
                className="absolute right-2 top-2 rounded-full bg-brand-ink-900/75 p-1 text-white hover:bg-brand-ink-900"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <p className="text-xs text-brand-ink-500">
            {staged.file.name} · {(staged.file.size / 1024 / 1024).toFixed(2)} MB
          </p>
          {progress !== null && (
            <div className="h-2 w-full overflow-hidden rounded-full bg-brand-ink-100">
              <div
                className="h-full bg-brand-yellow-400 transition-[width] duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          <button
            type="button"
            onClick={upload}
            disabled={uploading}
            className="rounded-lg bg-brand-yellow-400 hover:bg-brand-yellow-500 px-4 py-3 font-medium text-brand-ink-900 disabled:opacity-50"
          >
            {uploading ? `Uploading… ${progress ?? 0}%` : 'Upload photo'}
          </button>
        </div>
      ) : (
        <label className="flex items-center justify-center gap-2 rounded-lg bg-brand-yellow-400 hover:bg-brand-yellow-500 px-4 py-3 font-medium text-brand-ink-900">
          <Camera size={18} />
          <span>Take / choose photo</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => selectFile(e.target.files?.[0] ?? null)}
          />
        </label>
      )}
    </div>
  );
}
