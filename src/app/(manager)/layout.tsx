import { AppHeader } from '@/components/AppHeader';
import { requireRole } from '@/lib/session';

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const emp = await requireRole(['manager', 'admin']);
  return (
    <>
      <AppHeader employee={emp} />
      <main className="flex-1">{children}</main>
    </>
  );
}
