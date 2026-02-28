'use client';

import { ReactNode } from 'react';

interface ChartWrapperProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

export function ChartWrapper({ title, subtitle, children, className = '' }: ChartWrapperProps) {
  return (
    <div className={`bg-background rounded-2xl border border-border p-6 shadow-sm ${className}`}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
