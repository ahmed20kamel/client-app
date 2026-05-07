'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
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
    <div className="space-y-0.5 pt-1">
      {groups.map(group => {
        const isOpen   = !!open[group.label];
        const isActive = groupIsActive(group, pathname);
        return (
          <div key={group.label}>
            <button
              onClick={() => toggle(group.label)}
              className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md transition-all group ${
                isActive
                  ? 'text-sidebar-primary'
                  : 'text-sidebar-foreground/35 hover:text-sidebar-foreground/60'
              }`}
            >
              <span className="text-[9.5px] font-bold uppercase tracking-[0.2em]">
                {group.label}
              </span>
              <ChevronRight
                className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-90' : 'rotate-0'}`}
              />
            </button>

            <div
              className={`overflow-hidden transition-all duration-200 ${
                isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="space-y-0.5 pb-1.5 ps-1">
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
