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
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-brand-ink-200">
        <div className="flex flex-col items-center gap-3 bg-brand-ink-900 px-6 pt-8 pb-5 text-brand-ink-50">
          <LogoMark variant="full" className="h-36 w-auto sm:h-40" />
          <p className="text-base font-semibold tracking-wide">
            <span>Clock in </span>
            <span className="text-brand-yellow-400">→</span>
            <span className="ml-1 text-brand-yellow-400">Get paid! 💰💵</span>
          </p>
        </div>
        <div className="brand-stripe" aria-hidden />
        <form action={login} className="flex flex-col gap-3 p-6">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-brand-ink-700">Employee code</span>
            <input
              name="code"
              autoCapitalize="characters"
              autoComplete="username"
              required
              className="rounded-lg border border-brand-ink-200 bg-white px-3 py-2 text-base focus:border-brand-yellow-400 focus:outline-none focus:ring-2 focus:ring-brand-yellow-400/40"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-brand-ink-700">Password</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="rounded-lg border border-brand-ink-200 bg-white px-3 py-2 text-base focus:border-brand-yellow-400 focus:outline-none focus:ring-2 focus:ring-brand-yellow-400/40"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            className="mt-2 rounded-lg bg-brand-yellow-400 px-4 py-2 font-semibold text-brand-ink-900 shadow-sm hover:bg-brand-yellow-500 active:bg-brand-yellow-600"
          >
            Sign in
          </button>
        </form>
        <p className="px-6 pb-6 text-center text-xs text-brand-ink-500">
          Forgot your password? Ask your administrator to reset it.
        </p>
      </div>
    </div>
  );
}
