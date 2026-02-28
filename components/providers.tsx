'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { arSA, enUS } from '@clerk/localizations';
import { useParams } from 'next/navigation';

export function Providers({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';

  return (
    <ClerkProvider
      localization={locale === 'ar' ? arSA : enUS}
      signInUrl={`/${locale}/sign-in`}
      signUpUrl={`/${locale}/sign-up`}
      afterSignOutUrl={`/${locale}/sign-in`}
    >
      {children}
    </ClerkProvider>
  );
}
