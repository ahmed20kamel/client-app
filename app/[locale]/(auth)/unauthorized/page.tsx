'use client';

import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { ShieldX, LogOut, Mail } from 'lucide-react';

export default function UnauthorizedPage() {
  const t = useTranslations('unauthorized');
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'en';

  const handleSignOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push(`/${locale}/login`);
    router.refresh();
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-background p-4"
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="animate-fade-in max-w-md w-full">
        <div className="bg-card rounded-2xl shadow-premium p-8 text-center space-y-6">
          {/* Icon */}
          <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldX className="w-10 h-10 text-destructive" />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              {t('title')}
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t('description')}
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-muted/50 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground">
              <Mail className="w-4 h-4" />
              <span>{t('contactAdmin')}</span>
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium transition-all"
          >
            <LogOut className="w-4 h-4" />
            {t('signOut')}
          </button>
        </div>
      </div>
    </div>
  );
}
