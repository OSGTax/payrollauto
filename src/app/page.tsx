import { redirect } from 'next/navigation';
import { getCurrentEmployee } from '@/lib/session';

export default async function Home() {
  const emp = await getCurrentEmployee();
  if (!emp) redirect('/login');
  switch (emp.role) {
    case 'admin':
      redirect('/admin');
    default:
      redirect('/clock');
  }
}
