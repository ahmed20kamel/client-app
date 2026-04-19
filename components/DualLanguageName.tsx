'use client';

import { useParams } from 'next/navigation';
import { cn } from '@/lib/utils';

interface DualLanguageNameProps {
  name: string;
  nameAr?: string | null;
  subtitle?: string | null;
  subtitleIcon?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md';
}

export function DualLanguageName({ name, nameAr, subtitle, subtitleIcon, className, size = 'md' }: DualLanguageNameProps) {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'en';
  const isAr = locale === 'ar';

  const primary   = isAr && nameAr ? nameAr : name;
  const secondary = isAr && nameAr ? name    : nameAr;
  const primaryDir   = isAr && nameAr ? 'rtl' : 'ltr';
  const secondaryDir = isAr && nameAr ? 'ltr' : 'rtl';

  return (
    <div className={className}>
      <p className={cn('font-semibold text-foreground leading-snug', size === 'sm' ? 'text-xs' : 'text-sm')} dir={primaryDir}>
        {primary}
      </p>
      {secondary && (
        <p className={cn('text-muted-foreground leading-snug', size === 'sm' ? 'text-[10px]' : 'text-xs')} dir={secondaryDir}>
          {secondary}
        </p>
      )}
      {subtitle && (
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
          {subtitleIcon}
          <span className="truncate">{subtitle}</span>
        </p>
      )}
    </div>
  );
}
