import { AppHeader } from '@/components/AppHeader';
import { AppNav } from '@/components/AppNav';
import { getCurrentEmployee } from '@/lib/session';
import { countPendingApprovals } from '@/lib/approvals';
import { redirect } from 'next/navigation';

export default async function WorkerLayout({ children }: { children: React.ReactNode }) {
  const emp = await getCurrentEmployee();
  if (!emp) redirect('/login');
  const canApprove = emp.role === 'manager' || emp.role === 'admin';
  const pendingCount = canApprove ? await countPendingApprovals() : 0;
  return (
    <>
      <AppHeader employee={emp} />
      <main className="flex-1 pb-24">{children}</main>
      <AppNav role={emp.role} pendingCount={pendingCount} />
    </>
  );
}
