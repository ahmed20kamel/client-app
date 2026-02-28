import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import Image from 'next/image';
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  BarChart3,
  UserCog,
  ChevronRight,
  Search,
  ClipboardList,
  CheckCircle2,
  TrendingUp,
  Building2,
  Settings,
} from 'lucide-react';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { LogoutButton } from '@/components/LogoutButton';
import { MobileSidebar } from '@/components/MobileSidebar';

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();

  if (!session) {
    redirect(`/${locale}/login`);
  }

  const t = await getTranslations();

  const navItems = [
    { href: `/${locale}/dashboard`, label: t('navigation.dashboard'), icon: LayoutDashboard },
    { href: `/${locale}/customers`, label: t('navigation.customers'), icon: Users },
    { href: `/${locale}/tasks`, label: t('navigation.tasks'), icon: CheckSquare },
    { href: `/${locale}/internal-tasks`, label: t('navigation.internalTasks'), icon: ClipboardList },
    { href: `/${locale}/approvals`, label: t('navigation.approvals'), icon: CheckCircle2 },
    { href: `/${locale}/reports`, label: t('navigation.reports'), icon: BarChart3 },
  ];

  const adminItems: typeof navItems = [];
  if (session.user?.role === 'Admin') {
    navItems.push(
      { href: `/${locale}/users`, label: t('navigation.users'), icon: UserCog },
      { href: `/${locale}/performance`, label: t('navigation.performance'), icon: TrendingUp },
    );
    adminItems.push(
      { href: `/${locale}/departments`, label: t('navigation.departments'), icon: Building2 },
    );
  }

  // Serialize nav items for the client component (icons as string names)
  const mobileNavItems = navItems.map((item) => ({
    href: item.href,
    label: item.label,
    icon: item.icon.displayName || item.icon.name || 'LayoutDashboard',
  }));

  const mobileAdminItems = adminItems.map((item) => ({
    href: item.href,
    label: item.label,
    icon: item.icon.displayName || item.icon.name || 'Building2',
  }));

  // Get user initials for avatar
  const initials = session.user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

  return (
    <div className="min-h-screen bg-background" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      {/* Desktop Sidebar - hidden on mobile */}
      <aside className="hidden lg:block fixed top-0 start-0 z-40 w-72 h-screen">
        <div className="h-full flex flex-col bg-sidebar text-sidebar-foreground">
          {/* Logo */}
          <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <Image src="/logo.svg" alt="Logo" width={36} height={36} />
              <div>
                <h1 className="text-lg font-bold text-sidebar-foreground">CRM Pro</h1>
                <p className="text-[10px] text-sidebar-foreground/50 font-medium tracking-wider uppercase">Enterprise</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 group"
                >
                  <Icon className="w-5 h-5 text-sidebar-foreground/60 group-hover:text-sidebar-primary transition-colors" />
                  <span>{item.label}</span>
                  <ChevronRight className="w-4 h-4 ms-auto opacity-0 rtl:rotate-180 -translate-x-2 rtl:translate-x-2 group-hover:translate-x-0 group-hover:opacity-100 transition-all" />
                </Link>
              );
            })}

            {/* Settings Section (Admin) */}
            {adminItems.length > 0 && (
              <>
                <div className="pt-4 pb-2 px-3.5">
                  <p className="text-[11px] font-semibold text-sidebar-foreground/35 uppercase tracking-wider flex items-center gap-1.5">
                    <Settings className="w-3 h-3" />
                    {t('navigation.settings')}
                  </p>
                </div>
                {adminItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 group"
                    >
                      <Icon className="w-5 h-5 text-sidebar-foreground/60 group-hover:text-sidebar-primary transition-colors" />
                      <span>{item.label}</span>
                      <ChevronRight className="w-4 h-4 ms-auto opacity-0 rtl:rotate-180 -translate-x-2 rtl:translate-x-2 group-hover:translate-x-0 group-hover:opacity-100 transition-all" />
                    </Link>
                  );
                })}
              </>
            )}
          </nav>

          {/* User Section */}
          <div className="p-3 border-t border-sidebar-border">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-sidebar-accent/50">
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {session.user?.name}
                </p>
                <p className="text-xs text-sidebar-foreground/50 truncate">
                  {session.user?.role}
                </p>
              </div>
              <LogoutButton locale={locale} />
            </div>

            {/* Language Switcher */}
            <div className="flex items-center gap-2 mt-2.5">
              <LanguageSwitcher locale={locale} />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:ms-72 min-h-screen flex flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-14 lg:h-16 bg-background/80 backdrop-blur-lg border-b border-border flex items-center justify-between px-4 lg:px-8 gap-3">
          {/* Mobile: Hamburger + Logo */}
          <div className="flex items-center gap-3 lg:hidden">
            <MobileSidebar
              locale={locale}
              navItems={mobileNavItems}
              adminItems={mobileAdminItems}
              settingsLabel={t('navigation.settings')}
              userName={session.user?.name || ''}
              userRole={session.user?.role || ''}
              initials={initials}
            />
            <Image src="/logo.svg" alt="Logo" width={28} height={28} className="lg:hidden" />
          </div>

          {/* Search - hidden on small mobile, visible from sm */}
          <div className="hidden sm:flex items-center gap-3 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('common.searchPlaceholder')}
                className="w-full h-10 ps-10 pe-4 rounded-xl border border-border/60 bg-secondary/30 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          {/* Right Side - Notifications & User */}
          <div className="flex items-center gap-2 sm:gap-4 ms-auto">
            <NotificationCenter />

            {/* User Info & Avatar */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="text-end hidden md:block">
                <p className="text-sm font-medium text-foreground">{session.user?.name}</p>
                <p className="text-xs text-muted-foreground">{session.user?.role}</p>
              </div>
              <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-primary/20 flex items-center justify-center text-xs lg:text-sm font-semibold text-primary shadow-lg shadow-primary/20">
                {initials}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content - responsive padding */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
