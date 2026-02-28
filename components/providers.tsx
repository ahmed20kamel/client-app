'use client';

import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';

export function Providers({ children, locale }: { children: React.ReactNode; locale: string }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      {children}
      <Toaster position={locale === 'ar' ? 'top-left' : 'top-right'} richColors />
    </ThemeProvider>
  );
}
