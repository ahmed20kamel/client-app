'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { SidebarLink } from './SidebarLink';

interface NavItem  { href: string; label: string; icon?: string; }
interface NavGroup { label: string; items: NavItem[]; }

function groupIsActive(group: NavGroup, pathname: string) {
  return group.items.some(i => pathname === i.href || pathname.startsWith(i.href + '/'));
}

export function SidebarNav({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();

  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map(g => [g.label, groupIsActive(g, pathname)]))
  );

  useEffect(() => {
    const active = groups.find(g => groupIsActive(g, pathname));
    if (active) setOpen(prev => ({ ...prev, [active.label]: true }));
  }, [pathname, groups]);

  const toggle = (label: string) =>
    setOpen(prev => ({ ...prev, [label]: !prev[label] }));

  return (
    <div className="space-y-0.5">
      {groups.map((group, gi) => {
        const isOpen   = !!open[group.label];
        const isActive = groupIsActive(group, pathname);
        return (
          <div key={group.label} className={gi > 0 ? 'mt-1' : ''}>
            <button
              onClick={() => toggle(group.label)}
              className={`
                w-full flex items-center justify-between px-3 py-1.5 rounded-md
                transition-colors duration-150 group
                ${isActive
                  ? 'text-sidebar-primary'
                  : 'text-sidebar-foreground/40 hover:text-sidebar-foreground/65'
                }
              `}
            >
              <span className="text-[10px] font-semibold tracking-[0.16em] uppercase">
                {group.label}
              </span>
              <ChevronDown
                className={`size-3 shrink-0 opacity-50 transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`}
              />
            </button>

            <div className={`overflow-hidden transition-all duration-200 ease-in-out ${
              isOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
            }`}>
              <div className="mt-0.5 mb-2 space-y-px">
                {group.items.map(item => (
                  <SidebarLink key={item.href} href={item.href} label={item.label} />
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
