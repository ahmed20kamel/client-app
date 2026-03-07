'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

// Map of route segments to translation keys
const ROUTE_MAP: Record<string, { navKey?: string; titleKey?: string }> = {
  dashboard: { navKey: 'navigation.dashboard' },
  customers: { navKey: 'navigation.customers' },
  tasks: { navKey: 'navigation.tasks' },
  'internal-tasks': { navKey: 'navigation.internalTasks' },
  approvals: { navKey: 'navigation.approvals' },
  reports: { navKey: 'navigation.reports' },
  users: { navKey: 'navigation.users' },
  departments: { navKey: 'navigation.departments' },
  performance: { navKey: 'navigation.performance' },
  notifications: { titleKey: 'notifications.title' },
  profile: { titleKey: 'profile.title' },
  // Sub-routes
  new: { titleKey: 'common.new' },
  edit: { titleKey: 'common.edit' },
};

export function Topbar() {
  const pathname = usePathname();
  const t = useTranslations();

  const breadcrumbs = useMemo(() => {
    const items: BreadcrumbItem[] = [];

    // Remove locale prefix (e.g., /en/ or /ar/)
    const withoutLocale = pathname.replace(/^\/(en|ar)/, '');
    const segments = withoutLocale.split('/').filter(Boolean);

    // Extract locale from pathname
    const localeMatch = pathname.match(/^\/(en|ar)/);
    const locale = localeMatch ? localeMatch[1] : 'en';

    // Home/Dashboard
    items.push({
      label: t('navigation.dashboard'),
      href: `/${locale}/dashboard`,
    });

    let currentPath = `/${locale}`;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      currentPath += `/${segment}`;

      // Skip if it's 'dashboard' (already in home)
      if (segment === 'dashboard') continue;

      // Check if it's a UUID (dynamic segment like [id])
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);
      if (isUuid) continue; // Skip UUID segments in breadcrumb display

      const routeInfo = ROUTE_MAP[segment];
      if (routeInfo) {
        const label = routeInfo.navKey ? t(routeInfo.navKey) : routeInfo.titleKey ? t(routeInfo.titleKey) : segment;
        const isLast = i === segments.length - 1;

        items.push({
          label,
          href: isLast ? undefined : currentPath,
        });
      }
    }

    return items;
  }, [pathname, t]);

  // Don't render breadcrumbs if we're just on dashboard
  if (breadcrumbs.length <= 1) return null;

  return (
    <nav className="flex items-center gap-1.5 text-sm min-w-0">
      {breadcrumbs.map((item, index) => {
        const isLast = index === breadcrumbs.length - 1;
        return (
          <span key={index} className="flex items-center gap-1.5 min-w-0">
            {index > 0 && (
              <ChevronRight className="size-3.5 text-muted-foreground/50 shrink-0 rtl:-scale-x-100" />
            )}
            {index === 0 && (
              <Home className="size-3.5 text-muted-foreground shrink-0" />
            )}
            {isLast ? (
              <span className="font-medium text-foreground truncate">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href!}
                className="text-muted-foreground hover:text-foreground transition-colors truncate"
              >
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
