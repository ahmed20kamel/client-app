'use client';

import { useEffect } from 'react';

export function DirectionSetter({ locale }: { locale: string }) {
  useEffect(() => {
    const dir = locale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale]);

  return null;
}
