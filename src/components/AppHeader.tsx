import Link from 'next/link';
import { LogoMark } from './LogoMark';
import { logout } from '@/app/login/actions';
import type { Employee } from '@/lib/types';

export function AppHeader({ employee, children }: { employee: Employee; children?: React.ReactNode }) {
  const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME ?? 'PayrollAuto';
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 py-2 backdrop-blur">
      <Link href="/" className="flex items-center gap-2">
        <LogoMark className="h-8 w-8" />
        <span className="hidden text-sm font-semibold sm:inline">{companyName}</span>
      </Link>
      {children}
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-500">
          {employee.first_name} · <span className="uppercase">{employee.role}</span>
        </span>
        <form action={logout}>
          <button className="rounded-md px-2 py-1 text-xs text-slate-500 hover:text-slate-900">
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
