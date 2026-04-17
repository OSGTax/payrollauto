import { AppHeader } from '@/components/AppHeader';
import { AppNav } from '@/components/AppNav';
import { requireRole } from '@/lib/session';
import { countPendingApprovals } from '@/lib/approvals';

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const emp = await requireRole(['manager', 'admin']);
  const pendingCount = await countPendingApprovals();
  return (
    <>
      <AppHeader employee={emp} />
      <main className="flex-1 pb-24">{children}</main>
      <AppNav role={emp.role} pendingCount={pendingCount} />
    </>
  );
}
