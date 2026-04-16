import { adminClient } from '@/lib/supabase/admin';
import { LogoMark } from '@/components/LogoMark';
import { redirect } from 'next/navigation';
import { createFirstAdmin } from './actions';

export const dynamic = 'force-dynamic';

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const admin = adminClient();
  const { count } = await admin
    .from('employees')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'admin');

  if ((count ?? 0) > 0) redirect('/login');

  const { error } = await searchParams;
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-6 flex flex-col items-center gap-3">
          <LogoMark className="h-14 w-14" />
          <h1 className="text-xl font-semibold">First-time setup</h1>
          <p className="text-center text-sm text-slate-500">
            Create the first administrator account. This page disables itself after one admin exists.
          </p>
        </div>
        <form action={createFirstAdmin} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Employee code</span>
            <input
              name="emp_code"
              defaultValue="ADMIN"
              autoCapitalize="characters"
              required
              className="rounded-lg border border-slate-300 px-3 py-2 text-base"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">First name</span>
              <input
                name="first_name"
                required
                className="rounded-lg border border-slate-300 px-3 py-2 text-base"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Last name</span>
              <input
                name="last_name"
                required
                className="rounded-lg border border-slate-300 px-3 py-2 text-base"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Password (≥ 8 characters)</span>
            <input
              name="password"
              type="password"
              minLength={8}
              required
              className="rounded-lg border border-slate-300 px-3 py-2 text-base"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            className="mt-2 rounded-lg bg-slate-900 px-4 py-2 font-medium text-white active:bg-slate-700"
          >
            Create admin
          </button>
        </form>
      </div>
    </div>
  );
}
