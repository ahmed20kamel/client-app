import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';

// Can be imported from a shared config
const locales = ['en', 'ar'] as const;
const defaultLocale = 'en';

export default getRequestConfig(async ({ requestLocale }) => {
  // Typically corresponds to the `[locale]` segment
  const requested = await requestLocale;
  const locale = hasLocale(locales, requested) ? requested : defaultLocale;

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  };
});
