'use client';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const tabs = [
  { label: 'Overview',        href: '' },
  { label: 'Requests',        href: '/requests' },
  { label: 'Quotations',      href: '/quotations' },
  { label: 'Orders',          href: '/orders' },
  { label: 'Receipts',        href: '/receipts' },
  { label: 'Invoices',        href: '/invoices' },
  { label: 'Payments',        href: '/payments' },
  { label: 'Materials List',  href: '/materials' },
];

export default function ProcurementLayout({ children }: { children: React.ReactNode }) {
  const { locale } = useParams() as { locale: string };
  const pathname = usePathname();
  const base = `/${locale}/procurement`;
  return (
    <div className="flex flex-col min-h-screen">
      <div className="border-b border-border bg-background sticky top-0 z-10">
        <div className="max-w-screen-xl mx-auto px-4">
          <div className="flex items-center gap-1 overflow-x-auto py-0 no-scrollbar">
            {tabs.map(tab => {
              const href = `${base}${tab.href}`;
              const active =
                tab.href === ''
                  ? pathname === base || pathname === `${base}/`
                  : pathname.startsWith(`${base}${tab.href}`);
              return (
                <Link
                  key={tab.href}
                  href={href}
                  className={cn(
                    'px-4 py-3 text-[13px] font-medium whitespace-nowrap border-b-2 transition-colors',
                    active
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
      <div className="flex-1 max-w-screen-xl mx-auto w-full px-4 py-6">{children}</div>
    </div>
  );
}
