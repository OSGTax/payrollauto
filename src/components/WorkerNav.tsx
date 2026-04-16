'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Clock, CalendarDays, Stethoscope, Camera, MessageSquareText } from 'lucide-react';

const items = [
  { href: '/clock', label: 'Clock', icon: Clock },
  { href: '/week', label: 'Week', icon: CalendarDays },
  { href: '/sick', label: 'Sick', icon: Stethoscope },
  { href: '/photos', label: 'Photos', icon: Camera },
  { href: '/request-change', label: 'Change', icon: MessageSquareText },
];

export function WorkerNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 border-t border-slate-200 bg-white">
      <ul className="mx-auto flex max-w-xl items-stretch justify-between">
        {items.map((it) => {
          const active = pathname === it.href || pathname.startsWith(it.href + '/');
          const Icon = it.icon;
          return (
            <li key={it.href} className="flex-1">
              <Link
                href={it.href}
                className={`flex flex-col items-center gap-1 py-2 text-xs ${
                  active ? 'text-slate-900' : 'text-slate-400'
                }`}
              >
                <Icon size={20} />
                <span>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
