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
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-brand-ink-200">
        <div className="flex flex-col items-center gap-3 bg-brand-ink-900 px-6 pt-6 pb-5 text-brand-ink-50">
          <LogoMark variant="full" className="h-16 w-auto" />
          <h1 className="text-xl font-semibold text-brand-yellow-400">First-time setup</h1>
          <p className="text-center text-sm text-brand-ink-300">
            Create the first administrator account. This page disables itself after one admin exists.
          </p>
        </div>
        <div className="brand-stripe" aria-hidden />
        <form action={createFirstAdmin} className="flex flex-col gap-3 p-6">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-brand-ink-700">Employee code</span>
            <input
              name="emp_code"
              defaultValue="ADMIN"
              autoCapitalize="characters"
              required
              className="rounded-lg border border-brand-ink-200 bg-white px-3 py-2 text-base focus:border-brand-yellow-400 focus:outline-none focus:ring-2 focus:ring-brand-yellow-400/40"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-brand-ink-700">First name</span>
              <input
                name="first_name"
                required
                className="rounded-lg border border-brand-ink-200 bg-white px-3 py-2 text-base focus:border-brand-yellow-400 focus:outline-none focus:ring-2 focus:ring-brand-yellow-400/40"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-brand-ink-700">Last name</span>
              <input
                name="last_name"
                required
                className="rounded-lg border border-brand-ink-200 bg-white px-3 py-2 text-base focus:border-brand-yellow-400 focus:outline-none focus:ring-2 focus:ring-brand-yellow-400/40"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-brand-ink-700">Password (≥ 8 characters)</span>
            <input
              name="password"
              type="password"
              minLength={8}
              required
              className="rounded-lg border border-brand-ink-200 bg-white px-3 py-2 text-base focus:border-brand-yellow-400 focus:outline-none focus:ring-2 focus:ring-brand-yellow-400/40"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            className="mt-2 rounded-lg bg-brand-yellow-400 px-4 py-2 font-semibold text-brand-ink-900 shadow-sm hover:bg-brand-yellow-500 active:bg-brand-yellow-600"
          >
            Create admin
          </button>
        </form>
      </div>
    </div>
  );
}
