import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import Image from 'next/image';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { LogoutButton } from '@/components/LogoutButton';
import { MobileSidebar } from '@/components/MobileSidebar';
import { SidebarLink } from '@/components/SidebarLink';
import { SidebarNav } from '@/components/SidebarNav';
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
  const pagePerms = new Set(session.user?.pagePermissions ?? []);

  type NavItem  = { href: string; label: string; icon: string };
  type NavGroup = { label: string; items: NavItem[] };

  type RawItem = NavItem & { perm: string | null };
  const filterItem = (perm: string | null) => {
    if (perm === '__admin__') return isAdmin;
    if (perm === null) return true;
    if (isAdmin) return true;
    return pagePerms.has(perm);
  };
  const pick = (items: RawItem[]): NavItem[] =>
    items.filter(i => filterItem(i.perm)).map(({ perm: _p, ...rest }) => rest);

  const allGroups: { label: string; items: RawItem[] }[] = [
    {
      label: 'CRM',
      items: [
        { href: `/${locale}/dashboard`,  label: t('navigation.dashboard'), icon: 'LayoutDashboard', perm: 'page.dashboard' },
        { href: `/${locale}/customers`,  label: t('navigation.customers'), icon: 'Users',           perm: 'page.customers' },
        { href: `/${locale}/tasks`,      label: t('navigation.tasks'),     icon: 'CheckSquare',     perm: 'page.tasks' },
      ],
    },
    {
      label: 'Operations',
      items: [
        { href: `/${locale}/internal-tasks`, label: t('navigation.internalTasks'), icon: 'ClipboardList', perm: null },
        { href: `/${locale}/approvals`,      label: t('navigation.approvals'),     icon: 'CheckCircle2',  perm: 'page.approvals' },
      ],
    },
    {
      label: 'Sales',
      items: [
        { href: `/${locale}/clients`,         label: t('navigation.clients'),        icon: 'Building2',   perm: 'page.clients' },
        { href: `/${locale}/quotations`,      label: t('navigation.quotations'),     icon: 'FileText',    perm: 'page.quotations' },
        { href: `/${locale}/tax-invoices`,    label: t('navigation.taxInvoices'),    icon: 'Receipt',     perm: 'page.tax-invoices' },
        { href: `/${locale}/delivery-notes`,  label: t('navigation.deliveryNotes'),  icon: 'Package2',    perm: 'page.delivery-notes' },
        { href: `/${locale}/work-orders`,     label: t('navigation.workOrders'),     icon: 'ClipboardList', perm: 'page.work-orders' },
      ],
    },
    {
      label: 'Inventory',
      items: [
        { href: `/${locale}/inventory`,       label: t('navigation.inventory'),      icon: 'Package',     perm: 'page.inventory' },
        { href: `/${locale}/suppliers`,       label: t('navigation.suppliers'),      icon: 'Truck',       perm: 'page.suppliers' },
        { href: `/${locale}/purchase-orders`, label: t('navigation.purchaseOrders'), icon: 'ShoppingCart', perm: 'page.purchase-orders' },
      ],
    },
    {
      label: 'Finance',
      items: [
        { href: `/${locale}/payments`, label: t('navigation.payments'), icon: 'CreditCard', perm: 'page.payments' },
        { href: `/${locale}/accounts`, label: t('navigation.accounts'), icon: 'Wallet',     perm: 'page.accounts' },
      ],
    },
    {
      label: 'HR',
      items: [
        { href: `/${locale}/payroll/employees`, label: 'Employees',        icon: 'UserCheck',   perm: '__admin__' },
        { href: `/${locale}/payroll/projects`,  label: 'Projects',         icon: 'Briefcase',   perm: '__admin__' },
        { href: `/${locale}/payroll/timesheet`, label: 'Timesheet',        icon: 'CalendarClock', perm: '__admin__' },
        { href: `/${locale}/payroll/monthly`,   label: 'Monthly Payroll',  icon: 'Banknote',    perm: '__admin__' },
      ],
    },
    {
      label: 'Reports',
      items: [
        { href: `/${locale}/reports`,            label: t('navigation.reports'), icon: 'BarChart3',  perm: 'page.reports' },
        { href: `/${locale}/reports/sales-bonus`, label: 'Sales Bonus',          icon: 'TrendingUp', perm: 'page.reports' },
        { href: `/${locale}/performance`,        label: t('navigation.performance'), icon: 'TrendingUp', perm: 'page.performance' },
      ],
    },
  ];

  const navGroups: NavGroup[] = allGroups
    .map(g => ({ label: g.label, items: pick(g.items) }))
    .filter(g => g.items.length > 0);

  const adminItems: NavItem[] = isAdmin
    ? [{ href: `/${locale}/departments`, label: t('navigation.departments'), icon: 'Building2' }]
    : [];

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
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block fixed top-0 start-0 z-40 w-56 h-screen">
        <div className="h-full flex flex-col bg-sidebar text-sidebar-foreground">

          {/* Logo */}
          <div className="px-5 py-5 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <Image src="/logo.svg" alt="Stride ERP" width={32} height={32} loading="eager"
                className="brightness-0 invert object-contain shrink-0" style={{ height: 'auto' }} />
              <div>
                <p className="text-[13px] font-semibold text-sidebar-accent-foreground leading-tight tracking-tight">Stride ERP</p>
                <p className="text-[10px] text-sidebar-foreground/40 tracking-wide mt-0.5">Management System</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-3 overflow-y-auto">
            <SidebarNav groups={navGroups} />

            {adminItems.length > 0 && (
              <div className="mt-3 pt-3 border-t border-sidebar-border">
                <p className="px-3 mb-1.5 text-[10px] font-semibold text-sidebar-foreground/35 uppercase tracking-[0.16em]">
                  {t('navigation.settings')}
                </p>
                {adminItems.map((item) => (
                  <SidebarLink key={item.href} href={item.href} label={item.label} />
                ))}
              </div>
            )}
          </nav>

          {/* User footer */}
          <div className="border-t border-sidebar-border px-3 py-3 space-y-2">
            <Link href={`/${locale}/profile`}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-sidebar-accent/60 transition-colors group">
              {profileImage ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={profileImage} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-sidebar-accent flex items-center justify-center text-[11px] font-semibold text-sidebar-primary shrink-0">
                  {initials}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-sidebar-accent-foreground truncate leading-tight">{session.user?.name}</p>
                <p className="text-[10px] text-sidebar-foreground/45 truncate">{session.user?.role}</p>
              </div>
              <LogoutButton locale={locale} />
            </Link>
            <div className="px-1">
              <LanguageSwitcher locale={locale} />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:ms-56 min-h-screen flex flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-14 lg:h-16 bg-background/80 backdrop-blur-lg border-b border-border flex items-center justify-between px-4 lg:px-8 gap-3">
          {/* Mobile: Hamburger + Logo */}
          <div className="flex items-center gap-3 lg:hidden">
            <MobileSidebar
              locale={locale}
              navGroups={navGroups}
              adminItems={adminItems}
              settingsLabel={t('navigation.settings')}
              userName={session.user?.name || ''}
              userRole={session.user?.role || ''}
              initials={initials}
            />
            <Image src="/logo.svg" alt="Stride ERP" width={32} height={32} loading="eager" className="lg:hidden object-contain" style={{ height: 'auto' }} />
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
