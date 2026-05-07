'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, CheckSquare, BarChart3, UserCog,
  ClipboardList, CheckCircle2, TrendingUp, Building2, Package,
  Package2, Truck, FileText, Receipt, CreditCard, ShoppingCart,
  Wallet, UserCheck, Briefcase, CalendarClock, Banknote,
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, Users, CheckSquare, BarChart3, UserCog,
  ClipboardList, CheckCircle2, TrendingUp, Building2, Package,
  Package2, Truck, FileText, Receipt, CreditCard, ShoppingCart,
  Wallet, UserCheck, Briefcase, CalendarClock, Banknote,
};

interface SidebarLinkProps { href: string; label: string; icon: string; }

export function SidebarLink({ href, label, icon }: SidebarLinkProps) {
  const Icon = iconMap[icon] || LayoutDashboard;
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + '/');

  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] transition-all duration-100 group ${
        isActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
          : 'text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 font-normal'
      }`}
    >
      <Icon className={`size-[15px] shrink-0 transition-colors ${
        isActive
          ? 'text-sidebar-primary'
          : 'text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70'
      }`} />
      <span className="truncate">{label}</span>
    </Link>
  );
}
