'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { savePhase, saveCategory, deletePhase, deleteCategory } from '../actions';
import type { Phase, Category } from '@/lib/types';

export function PhasesCatsEditor({
  job,
  phases,
  cats,
}: {
  job: string;
  phases: Phase[];
  cats: Category[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [newPhase, setNewPhase] = useState({ code: '', desc: '' });
  const [newCat, setNewCat] = useState<Record<string, { code: string; desc: string }>>({});

  function addPhase() {
    if (!newPhase.code) return;
    startTransition(async () => {
      await savePhase(job, null, newPhase.code.toUpperCase(), newPhase.desc);
      setNewPhase({ code: '', desc: '' });
      router.refresh();
    });
  }

  function addCat(phase: string) {
    const val = newCat[phase] ?? { code: '', desc: '' };
    if (!val.code) return;
    startTransition(async () => {
      await saveCategory(job, phase, null, val.code.toUpperCase(), val.desc);
      setNewCat({ ...newCat, [phase]: { code: '', desc: '' } });
      router.refresh();
    });
  }

  function removePhase(phase: string) {
    if (!confirm(`Delete phase ${phase} and all its categories?`)) return;
    startTransition(async () => {
      await deletePhase(job, phase);
      router.refresh();
    });
  }

  function removeCat(phase: string, cat: string) {
    if (!confirm(`Delete category ${cat}?`)) return;
    startTransition(async () => {
      await deleteCategory(job, phase, cat);
      router.refresh();
    });
  }

  return (
    <section className="mt-8">
      <h2 className="mb-2 font-semibold">Phases &amp; categories</h2>
      <div className="mb-4 flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-3">
        <input
          placeholder="Phase code (≤4)"
          maxLength={4}
          value={newPhase.code}
          onChange={(e) => setNewPhase({ ...newPhase, code: e.target.value })}
          className="rounded border border-slate-300 px-2 py-1 text-sm"
        />
        <input
          placeholder="Description"
          value={newPhase.desc}
          onChange={(e) => setNewPhase({ ...newPhase, desc: e.target.value })}
          className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
        />
        <button
          onClick={addPhase}
          disabled={pending}
          className="rounded bg-slate-900 px-3 py-1 text-sm text-white"
        >
          + Phase
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {phases.map((p) => {
          const phaseCats = cats.filter((c) => c.phase_code === p.phase_code);
          const val = newCat[p.phase_code] ?? { code: '', desc: '' };
          return (
            <div key={p.phase_code} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium">
                  <span className="font-mono">{p.phase_code}</span> — {p.description}
                </p>
                <button
                  onClick={() => removePhase(p.phase_code)}
                  disabled={pending}
                  className="text-xs text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
              <ul className="mt-2 flex flex-col gap-1 text-sm">
                {phaseCats.map((c) => (
                  <li key={c.cat_code} className="flex items-center justify-between">
                    <span>
                      <span className="font-mono">{c.cat_code}</span> — {c.description}
                    </span>
                    <button
                      onClick={() => removeCat(p.phase_code, c.cat_code)}
                      disabled={pending}
                      className="text-xs text-red-600 hover:underline"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex flex-wrap gap-2">
                <input
                  placeholder="Cat code (≤6)"
                  maxLength={6}
                  value={val.code}
                  onChange={(e) =>
                    setNewCat({ ...newCat, [p.phase_code]: { ...val, code: e.target.value } })
                  }
                  className="rounded border border-slate-300 px-2 py-1 text-sm"
                />
                <input
                  placeholder="Description"
                  value={val.desc}
                  onChange={(e) =>
                    setNewCat({ ...newCat, [p.phase_code]: { ...val, desc: e.target.value } })
                  }
                  className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
                />
                <button
                  onClick={() => addCat(p.phase_code)}
                  disabled={pending}
                  className="rounded bg-slate-900 px-3 py-1 text-sm text-white"
                >
                  + Category
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
