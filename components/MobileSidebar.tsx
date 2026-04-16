'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, ChevronRight, Settings, X } from 'lucide-react';
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

interface MobileSidebarProps {
  locale: string;
  navItems: NavItem[];
  adminItems: NavItem[];
  settingsLabel: string;
  userName: string;
  userRole: string;
  initials: string;
}

// Map icon names to components - we pass icon name as string from server component
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
};

export function MobileSidebar({
  locale,
  navItems,
  adminItems,
  settingsLabel,
  userName,
  userRole,
  initials,
}: MobileSidebarProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isRtl = locale === 'ar';

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden p-2 rounded-xl hover:bg-secondary/80 text-foreground transition-colors"
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </button>

      {/* Mobile Sidebar Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side={isRtl ? 'right' : 'left'}
          showCloseButton={false}
          className="w-60 p-0 bg-sidebar text-sidebar-foreground border-none"
        >
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-sidebar-border">
            <div className="flex items-center justify-center flex-1">
              <Image src="/logo.svg" alt="SCoRD Logo" width={56} height={56} loading="eager" className="brightness-0 invert object-contain" style={{ height: 'auto' }} />
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/60 transition-colors shrink-0"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = iconMap[item.icon] || LayoutDashboard;
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/50 group-hover:text-sidebar-primary'} transition-colors`} />
                  <span>{item.label}</span>
                  <ChevronRight className="w-4 h-4 ms-auto opacity-0 rtl:rotate-180 group-hover:opacity-60 transition-all" />
                </Link>
              );
            })}

            {/* Admin Section */}
            {adminItems.length > 0 && (
              <>
                <div className="pt-3 pb-1.5 px-3.5">
                  <p className="text-[11px] font-semibold text-sidebar-foreground/35 uppercase tracking-wider flex items-center gap-1.5">
                    <Settings className="w-3 h-3" />
                    {settingsLabel}
                  </p>
                </div>
                {adminItems.map((item) => {
                  const Icon = iconMap[item.icon] || Building2;
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/50 group-hover:text-sidebar-primary'} transition-colors`} />
                      <span>{item.label}</span>
                      <ChevronRight className="w-4 h-4 ms-auto opacity-0 rtl:rotate-180 group-hover:opacity-60 transition-all" />
                    </Link>
                  );
                })}
              </>
            )}
          </nav>

          {/* User Section at Bottom */}
          <div className="p-3 border-t border-sidebar-border mt-auto">
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
