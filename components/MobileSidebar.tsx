'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, ChevronRight, ChevronDown, Settings, X } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface MobileSidebarProps {
  locale: string;
  navGroups: NavGroup[];
  adminItems: NavItem[];
  settingsLabel: string;
  userName: string;
  userRole: string;
  initials: string;
}

import {
  LayoutDashboard,
  Users,
  CheckSquare,
  BarChart3,
  UserCog,
  ClipboardList,
  CheckCircle2,
  TrendingUp,
  Building2,
  Package,
  Package2,
  Truck,
  FileText,
  Receipt,
  CreditCard,
  ShoppingCart,
  Wallet,
  UserCheck,
  Briefcase,
  CalendarClock,
  Banknote,
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Users,
  CheckSquare,
  BarChart3,
  UserCog,
  ClipboardList,
  CheckCircle2,
  TrendingUp,
  Building2,
  Package,
  Package2,
  Truck,
  FileText,
  Receipt,
  CreditCard,
  ShoppingCart,
  Wallet,
  UserCheck,
  Briefcase,
  CalendarClock,
  Banknote,
};

function NavLink({ item, onClick }: { item: NavItem; onClick: () => void }) {
  const pathname = usePathname();
  const Icon = iconMap[item.icon] || LayoutDashboard;
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
        isActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
      }`}
    >
      <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/50 group-hover:text-sidebar-primary'} transition-colors`} />
      <span className="truncate">{item.label}</span>
      <ChevronRight className="w-4 h-4 ms-auto shrink-0 opacity-0 rtl:rotate-180 group-hover:opacity-60 transition-all" />
    </Link>
  );
}

function groupIsActive(group: NavGroup, pathname: string) {
  return group.items.some(i => pathname === i.href || pathname.startsWith(i.href + '/'));
}

export function MobileSidebar({
  locale,
  navGroups,
  adminItems,
  settingsLabel,
  userName,
  userRole,
  initials,
}: MobileSidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(navGroups.map(g => [g.label, groupIsActive(g, pathname)]))
  );

  useEffect(() => {
    const active = navGroups.find(g => groupIsActive(g, pathname));
    if (active) setGroupOpen(prev => ({ ...prev, [active.label]: true }));
  }, [pathname, navGroups]);

  const toggleGroup = (label: string) =>
    setGroupOpen(prev => ({ ...prev, [label]: !prev[label] }));

  const isRtl = locale === 'ar';
  const close = () => setOpen(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden p-2 rounded-xl hover:bg-secondary/80 text-foreground transition-colors"
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side={isRtl ? 'right' : 'left'}
          showCloseButton={false}
          className="w-60 p-0 bg-sidebar text-sidebar-foreground border-none flex flex-col"
        >
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-sidebar-border shrink-0">
            <div className="flex items-center justify-center flex-1">
              <Image src="/logo.svg" alt="Stride ERP" width={56} height={56} loading="eager" className="brightness-0 invert object-contain" style={{ height: 'auto' }} />
            </div>
            <button
              onClick={close}
              className="p-1.5 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/60 transition-colors shrink-0"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-2 overflow-y-auto">
            <div className="space-y-0.5">
              {navGroups.map(group => {
                const isGroupOpen   = !!groupOpen[group.label];
                const isGroupActive = groupIsActive(group, pathname);
                return (
                  <div key={group.label}>
                    <button
                      onClick={() => toggleGroup(group.label)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-150 ${
                        isGroupActive
                          ? 'text-sidebar-primary'
                          : 'text-sidebar-foreground/50 hover:text-sidebar-foreground/80 hover:bg-sidebar-accent/30'
                      }`}
                    >
                      <span className="text-[11px] font-semibold tracking-widest uppercase">{group.label}</span>
                      <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${isGroupOpen ? 'rotate-0' : '-rotate-90'}`} />
                    </button>
                    <div className={`overflow-hidden transition-all duration-200 ${isGroupOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                      <div className="space-y-0.5 pb-1">
                        {group.items.map(item => (
                          <NavLink key={item.href} item={item} onClick={close} />
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Admin / Settings */}
            {adminItems.length > 0 && (
              <div>
                <div className="px-3 pt-4 pb-1">
                  <p className="text-[9px] font-bold text-sidebar-foreground/30 uppercase tracking-[0.15em] flex items-center gap-1.5">
                    <Settings className="w-3 h-3" />
                    {settingsLabel}
                  </p>
                </div>
                <div className="space-y-0.5">
                  {adminItems.map(item => (
                    <NavLink key={item.href} item={item} onClick={close} />
                  ))}
                </div>
              </div>
            )}
          </nav>

          {/* User */}
          <div className="p-3 border-t border-sidebar-border shrink-0">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-sidebar-accent/40">
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{userName}</p>
                <p className="text-xs text-sidebar-foreground/50 truncate">{userRole}</p>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
