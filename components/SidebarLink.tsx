'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronRight,
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
};

interface SidebarLinkProps {
  href: string;
  label: string;
  icon: string;
}

export function SidebarLink({ href, label, icon }: SidebarLinkProps) {
  const Icon = iconMap[icon] || LayoutDashboard;
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + '/');

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
        isActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground border-s-[3px] border-sidebar-primary'
          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
      }`}
    >
      <Icon className={`w-5 h-5 ${isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/60 group-hover:text-sidebar-primary'} transition-colors`} />
      <span>{label}</span>
      <ChevronRight className="w-4 h-4 ms-auto opacity-0 rtl:rotate-180 -translate-x-2 rtl:translate-x-2 group-hover:translate-x-0 group-hover:opacity-100 transition-all" />
    </Link>
  );
}
