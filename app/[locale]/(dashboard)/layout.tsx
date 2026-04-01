import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import Image from 'next/image';
import { Settings } from 'lucide-react';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { LogoutButton } from '@/components/LogoutButton';
import { MobileSidebar } from '@/components/MobileSidebar';
import { SidebarLink } from '@/components/SidebarLink';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Topbar } from '@/components/layout/Topbar';
import { ErrorBoundary } from '@/components/ErrorBoundary';

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

  const isAdmin = session.user?.role === 'Admin';

  const navItems = isAdmin
    ? [
        { href: `/${locale}/dashboard`, label: t('navigation.dashboard'), icon: 'LayoutDashboard' },
        { href: `/${locale}/customers`, label: t('navigation.customers'), icon: 'Users' },
        { href: `/${locale}/tasks`, label: t('navigation.tasks'), icon: 'CheckSquare' },
        { href: `/${locale}/internal-tasks`, label: t('navigation.internalTasks'), icon: 'ClipboardList' },
        { href: `/${locale}/approvals`, label: t('navigation.approvals'), icon: 'CheckCircle2' },
        { href: `/${locale}/reports`, label: t('navigation.reports'), icon: 'BarChart3' },
        { href: `/${locale}/quotations`, label: t('navigation.quotations'), icon: 'FileText' },
        { href: `/${locale}/tax-invoices`, label: t('navigation.taxInvoices'), icon: 'Receipt' },
        { href: `/${locale}/delivery-notes`, label: t('navigation.deliveryNotes'), icon: 'Package2' },
        { href: `/${locale}/invoices`, label: t('navigation.invoices'), icon: 'FileText' },
        { href: `/${locale}/payments`, label: t('navigation.payments'), icon: 'CreditCard' },
        { href: `/${locale}/inventory`, label: t('navigation.inventory'), icon: 'Package' },
        { href: `/${locale}/suppliers`, label: t('navigation.suppliers'), icon: 'Truck' },
        { href: `/${locale}/purchase-orders`, label: t('navigation.purchaseOrders'), icon: 'ShoppingCart' },
        { href: `/${locale}/users`, label: t('navigation.users'), icon: 'UserCog' },
        { href: `/${locale}/performance`, label: t('navigation.performance'), icon: 'TrendingUp' },
      ]
    : [
        { href: `/${locale}/internal-tasks`, label: t('navigation.internalTasks'), icon: 'ClipboardList' },
      ];

  const adminItems: typeof navItems = [];
  if (isAdmin) {
    adminItems.push(
      { href: `/${locale}/departments`, label: t('navigation.departments'), icon: 'Building2' },
    );
  }

  // Nav items already use string icon names, pass directly to mobile sidebar
  const mobileNavItems = navItems;
  const mobileAdminItems = adminItems;

  // Get user initials for avatar
  const initials = session.user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';
  const profileImage = session.user?.profileImage;

  return (
    <div className="min-h-screen bg-background" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      {/* Desktop Sidebar - hidden on mobile */}
      <aside className="hidden lg:block fixed top-0 start-0 z-40 w-60 h-screen">
        <div className="h-full flex flex-col bg-sidebar text-sidebar-foreground">
          {/* Logo */}
          <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <Image src="/logo.svg" alt="Logo" width={36} height={36} className="brightness-0 invert" />
              <div>
                <h1 className="text-lg font-bold text-sidebar-foreground">CRM Pro</h1>
                <p className="text-[10px] text-sidebar-foreground/50 font-medium tracking-wider uppercase">Enterprise</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <SidebarLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
            ))}

            {/* Settings Section (Admin) */}
            {adminItems.length > 0 && (
              <>
                <div className="pt-4 pb-2 px-3.5">
                  <p className="text-[11px] font-semibold text-sidebar-foreground/35 uppercase tracking-wider flex items-center gap-1.5">
                    <Settings className="w-3 h-3" />
                    {t('navigation.settings')}
                  </p>
                </div>
                {adminItems.map((item) => (
                  <SidebarLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
                ))}
              </>
            )}
          </nav>

          {/* User Section */}
          <div className="p-3 border-t border-sidebar-border">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-sidebar-accent/50">
              <Link href={`/${locale}/profile`} className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity">
                {profileImage ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={profileImage} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                    {initials}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {session.user?.name}
                  </p>
                  <p className="text-xs text-sidebar-foreground/50 truncate">
                    {session.user?.role}
                  </p>
                </div>
              </Link>
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
      <div className="lg:ms-60 min-h-screen flex flex-col">
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

          {/* Breadcrumbs - hidden on mobile */}
          <div className="hidden sm:flex items-center flex-1 min-w-0">
            <Topbar />
          </div>

          {/* Right Side - Notifications & User */}
          <div className="flex items-center gap-2 sm:gap-4 ms-auto">
            <ThemeToggle />
            <NotificationCenter />

            {/* User Info & Avatar */}
            <Link href={`/${locale}/profile`} className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity">
              <div className="text-end hidden md:block">
                <p className="text-sm font-medium text-foreground">{session.user?.name}</p>
                <p className="text-xs text-muted-foreground">{session.user?.role}</p>
              </div>
              {profileImage ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={profileImage} alt="" className="w-9 h-9 lg:w-10 lg:h-10 rounded-full object-cover shadow-lg shadow-primary/20" />
              ) : (
                <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-primary/20 flex items-center justify-center text-xs lg:text-sm font-semibold text-primary shadow-lg shadow-primary/20">
                  {initials}
                </div>
              )}
            </Link>
          </div>
        </header>

        {/* Page Content - responsive padding */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 mx-auto w-full max-w-[1600px]">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
