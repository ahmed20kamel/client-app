'use client';

interface DualLanguageNameProps {
  name: string;
  nameAr?: string | null;
  subtitle?: string | null;
  subtitleIcon?: React.ReactNode;
  className?: string;
}

export function DualLanguageName({ name, nameAr, subtitle, subtitleIcon, className }: DualLanguageNameProps) {
  return (
    <div className={className}>
      <p className="text-sm font-medium text-foreground">{name}</p>
      {nameAr && (
        <p className="text-xs text-muted-foreground" dir="rtl">{nameAr}</p>
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
