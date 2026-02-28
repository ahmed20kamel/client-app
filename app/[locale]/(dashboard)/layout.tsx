import { auth, checkUserAuthorization } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import Image from 'next/image';
import { Toaster } from 'sonner';
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
} from 'lucide-react';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { UserButton } from '@clerk/nextjs';

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
    // Check if user is signed in to Clerk but not in our DB
    const authStatus = await checkUserAuthorization();
    if (authStatus.isSignedIn && !authStatus.isAuthorized) {
      redirect(`/${locale}/unauthorized`);
    }
    redirect(`/${locale}/sign-in`);
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

  if (session.user?.role === 'Admin') {
    navItems.push(
      { href: `/${locale}/users`, label: t('navigation.users'), icon: UserCog },
      { href: `/${locale}/performance`, label: t('navigation.performance'), icon: TrendingUp },
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <Toaster position={locale === 'ar' ? 'top-left' : 'top-right'} richColors />

      {/* Sidebar */}
      <aside className="fixed top-0 start-0 z-40 w-72 h-screen">
        <div className="h-full flex flex-col bg-sidebar text-sidebar-foreground">
          {/* Logo */}
          <div className="h-20 flex items-center px-6 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <Image src="/logo.svg" alt="Logo" width={40} height={40} />
              <div>
                <h1 className="text-lg font-bold text-sidebar-foreground">CRM Pro</h1>
                <p className="text-xs text-sidebar-foreground/60">Enterprise Edition</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 group"
                >
                  <Icon className="w-5 h-5 text-sidebar-foreground/60 group-hover:text-sidebar-primary transition-colors" />
                  <span>{item.label}</span>
                  <ChevronRight className="w-4 h-4 ms-auto opacity-0 rtl:rotate-180 -translate-x-2 rtl:translate-x-2 group-hover:translate-x-0 group-hover:opacity-100 transition-all" />
                </Link>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-sidebar-accent/50">
              <UserButton
                afterSignOutUrl={`/${locale}/sign-in`}
                appearance={{
                  elements: {
                    avatarBox: 'w-10 h-10',
                  },
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {session.user?.name}
                </p>
                <p className="text-xs text-sidebar-foreground/60 truncate">
                  {session.user?.role}
                </p>
              </div>
            </div>

            {/* Language Switcher */}
            <div className="flex items-center gap-2 mt-3">
              <LanguageSwitcher locale={locale} />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="ms-72 min-h-screen flex flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-16 bg-background/80 backdrop-blur-lg border-b border-border flex items-center justify-between px-8">
          {/* Search */}
          <div className="flex items-center gap-3 flex-1 max-w-md">
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
          <div className="flex items-center gap-4">
            <NotificationCenter />

            {/* User Info & Avatar */}
            <div className="flex items-center gap-3">
              <div className="text-end hidden sm:block">
                <p className="text-sm font-medium text-foreground">{session.user?.name}</p>
                <p className="text-xs text-muted-foreground">{session.user?.role}</p>
              </div>
              <UserButton
                afterSignOutUrl={`/${locale}/sign-in`}
                appearance={{
                  elements: {
                    avatarBox: 'w-10 h-10 shadow-lg shadow-primary/20',
                  },
                }}
              />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
