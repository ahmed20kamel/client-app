'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarLinkProps { href: string; label: string; icon?: string; }

export function SidebarLink({ href, label }: SidebarLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + '/');

  return (
    <Link
      href={href}
      className={`
        group relative flex items-center gap-0 px-3 py-[7px] rounded-md text-[13px]
        transition-all duration-150 font-medium
        ${isActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50'
        }
      `}
    >
      {/* Active indicator bar */}
      {isActive && (
        <span className="absolute start-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-e-full bg-sidebar-primary" />
      )}
      <span className="ps-2 truncate leading-snug">{label}</span>
    </Link>
  );
}
