'use client';

import { ThemeProvider } from 'next-themes';
import { DirectionProvider } from '@radix-ui/react-direction';
import { Toaster } from '@/components/ui/sonner';

export function Providers({ children, locale }: { children: React.ReactNode; locale: string }) {
  return (
    <DirectionProvider dir={locale === 'ar' ? 'rtl' : 'ltr'}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      {children}
      <Toaster
        position={locale === 'ar' ? 'top-left' : 'top-right'}
        richColors
        duration={3500}
        visibleToasts={3}
      />
    </ThemeProvider>
    </DirectionProvider>
  );
}
