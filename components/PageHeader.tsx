'use client';

import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, icon: Icon, actions }: PageHeaderProps) {
  return (
    <div className="relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #3730A3 60%, #4F46E5 100%)' }}
    >
      {/* Glow effect */}
      <div className="absolute -top-10 -left-10 w-52 h-52 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(129,140,248,0.20) 0%, transparent 65%)' }}
      />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between px-6 sm:px-8 py-5 sm:py-6 gap-3 sm:gap-4">
        <div className="flex items-center gap-4">
          {Icon && (
            <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              <Icon size={22} className="text-indigo-200" />
            </div>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs sm:text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-wrap page-header-actions">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
