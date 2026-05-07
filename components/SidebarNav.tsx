'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { SidebarLink } from './SidebarLink';

interface NavItem  { href: string; label: string; icon: string; }
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
    <div className="space-y-px">
      {groups.map(group => {
        const isOpen   = !!open[group.label];
        const isActive = groupIsActive(group, pathname);
        return (
          <div key={group.label}>
            <button
              onClick={() => toggle(group.label)}
              className={`w-full flex items-center justify-between px-2.5 py-[5px] rounded transition-colors duration-100 ${
                isActive
                  ? 'text-sidebar-primary/80'
                  : 'text-sidebar-foreground/38 hover:text-sidebar-foreground/65'
              }`}
            >
              <span className="text-[10px] font-semibold tracking-[0.14em] uppercase">
                {group.label}
              </span>
              <ChevronDown
                className={`size-3 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`}
              />
            </button>

            <div className={`overflow-hidden transition-all duration-200 ease-in-out ${
              isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}>
              <div className="space-y-px pt-0.5 pb-2">
                {group.items.map(item => (
                  <SidebarLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
