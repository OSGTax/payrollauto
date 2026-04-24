import Link from 'next/link';
import { LogoMark } from './LogoMark';
import { HeaderClock } from './HeaderClock';
import { logout } from '@/app/login/actions';
import type { Employee } from '@/lib/types';

export function AppHeader({ employee, children }: { employee: Employee; children?: React.ReactNode }) {
  const appShortName = 'AJK Time';
  return (
    <div className="sticky top-0 z-10">
      <header className="flex items-center justify-between gap-3 bg-brand-ink-900 px-4 py-2 text-brand-ink-50">
        <Link href="/" className="flex items-center gap-2">
          <LogoMark className="h-8 w-8" />
          <span className="hidden text-sm font-semibold tracking-wide text-brand-yellow-400 sm:inline">
            {appShortName}
          </span>
        </Link>
        {children}
        <div className="flex items-center gap-3">
          <HeaderClock />
          <span className="text-xs text-brand-ink-300">
            {employee.first_name} ·{' '}
            <span className="uppercase tracking-wide text-brand-yellow-400">{employee.role}</span>
          </span>
          <form action={logout}>
            <button className="rounded-md px-2 py-1 text-xs text-brand-ink-300 hover:text-brand-yellow-400">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <div className="brand-stripe" aria-hidden />
    </div>
  );
}
