import Link from 'next/link';
import { AppHeader } from '@/components/AppHeader';
import { requireRole } from '@/lib/session';

const tabs = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/employees', label: 'Employees' },
  { href: '/admin/jobs', label: 'Jobs' },
  { href: '/admin/classes', label: 'Classes' },
  { href: '/admin/wcomp', label: 'WC codes' },
  { href: '/admin/departments', label: 'Departments' },
  { href: '/admin/entries', label: 'Entries' },
  { href: '/admin/requests', label: 'Requests' },
  { href: '/admin/export', label: 'Export' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const emp = await requireRole(['admin']);
  return (
    <>
      <AppHeader employee={emp} />
      <nav className="overflow-x-auto border-b border-brand-ink-200 bg-white">
        <ul className="mx-auto flex max-w-6xl gap-1 px-4 py-2">
          {tabs.map((t) => (
            <li key={t.href}>
              <Link
                href={t.href}
                className="whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium text-brand-ink-600 hover:bg-brand-yellow-100 hover:text-brand-ink-900"
              >
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <main className="flex-1">{children}</main>
    </>
  );
}
