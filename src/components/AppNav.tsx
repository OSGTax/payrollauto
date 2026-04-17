'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Clock, CalendarDays, Stethoscope, Camera, MessageSquareText, ClipboardCheck } from 'lucide-react';
import type { Role } from '@/lib/types';

type Item = { href: string; label: string; icon: React.ComponentType<{ size?: number }> };

const baseItems: Item[] = [
  { href: '/clock', label: 'Clock', icon: Clock },
  { href: '/week', label: 'Week', icon: CalendarDays },
  { href: '/sick', label: 'Sick', icon: Stethoscope },
  { href: '/photos', label: 'Photos', icon: Camera },
  { href: '/request-change', label: 'Change', icon: MessageSquareText },
];

const approveItem: Item = { href: '/approve', label: 'Approve', icon: ClipboardCheck };

export function AppNav({ role, pendingCount = 0 }: { role: Role; pendingCount?: number }) {
  const pathname = usePathname();
  const canApprove = role === 'manager' || role === 'admin';
  const items = canApprove ? [...baseItems, approveItem] : baseItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 border-t border-slate-200 bg-white">
      <ul className="mx-auto flex max-w-xl items-stretch justify-between">
        {items.map((it) => {
          const active = pathname === it.href || pathname.startsWith(it.href + '/');
          const Icon = it.icon;
          const showBadge = it.href === '/approve' && pendingCount > 0;
          return (
            <li key={it.href} className="flex-1">
              <Link
                href={it.href}
                className={`relative flex flex-col items-center gap-1 py-2 text-xs ${
                  active ? 'text-slate-900' : 'text-slate-400'
                }`}
              >
                <div className="relative">
                  <Icon size={20} />
                  {showBadge && (
                    <span className="absolute -right-3 -top-2 min-w-[18px] rounded-full bg-red-600 px-1 text-center text-[10px] font-semibold leading-[18px] text-white">
                      {pendingCount > 99 ? '99+' : pendingCount}
                    </span>
                  )}
                </div>
                <span>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
