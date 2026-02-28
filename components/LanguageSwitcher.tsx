'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Globe } from 'lucide-react';

export function LanguageSwitcher({ locale }: { locale: string }) {
  const pathname = usePathname();
  const pathWithoutLocale = pathname.replace(/^\/(en|ar)/, '');

  return (
    <div className="flex-1 flex gap-1">
      <Link
        href={`/en${pathWithoutLocale || '/dashboard'}`}
        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-lg transition-all ${
          locale === 'en'
            ? 'bg-sidebar-primary text-sidebar-primary-foreground'
            : 'bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent/80'
        }`}
      >
        <Globe className="size-3.5" />
        EN
      </Link>
      <Link
        href={`/ar${pathWithoutLocale || '/dashboard'}`}
        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-lg transition-all ${
          locale === 'ar'
            ? 'bg-sidebar-primary text-sidebar-primary-foreground'
            : 'bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent/80'
        }`}
      >
        <Globe className="size-3.5" />
        AR
      </Link>
    </div>
  );
}
