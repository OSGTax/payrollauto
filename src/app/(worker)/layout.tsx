import { AppHeader } from '@/components/AppHeader';
import { WorkerNav } from '@/components/WorkerNav';
import { getCurrentEmployee } from '@/lib/session';
import { redirect } from 'next/navigation';

export default async function WorkerLayout({ children }: { children: React.ReactNode }) {
  const emp = await getCurrentEmployee();
  if (!emp) redirect('/login');
  return (
    <>
      <AppHeader employee={emp} />
      <main className="flex-1 pb-24">{children}</main>
      <WorkerNav />
    </>
  );
}
