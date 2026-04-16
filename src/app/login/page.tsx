import { LogoMark } from '@/components/LogoMark';
import { login } from './actions';

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return <LoginForm searchParams={searchParams} />;
}

async function LoginForm({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME ?? 'PayrollAuto';
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-6 flex flex-col items-center gap-3">
          <LogoMark className="h-14 w-14" />
          <h1 className="text-xl font-semibold">{companyName}</h1>
          <p className="text-sm text-slate-500">Sign in to log your time.</p>
        </div>
        <form action={login} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Employee code</span>
            <input
              name="code"
              autoCapitalize="characters"
              autoComplete="username"
              required
              className="rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Password</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            className="mt-2 rounded-lg bg-slate-900 px-4 py-2 font-medium text-white active:bg-slate-700"
          >
            Sign in
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-slate-500">
          Forgot your password? Ask your administrator to reset it.
        </p>
      </div>
    </div>
  );
}
