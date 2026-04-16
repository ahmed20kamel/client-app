import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function intlLocale(locale: string) {
  return locale === 'ar' ? 'ar-AE' : 'en-AE';
}

export function formatCurrency(value: number, locale: string): string {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: 'currency',
    currency: 'AED',
    maximumFractionDigits: 0,
  }).format(value);
}

/** Null-safe version — returns '-' when value is null/undefined */
export function fmtCurrency(value: number | null | undefined, locale: string): string {
  if (value == null) return '-';
  return formatCurrency(value, locale);
}

export function formatDate(date: string | Date | null | undefined, locale: string): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString(intlLocale(locale));
}

/** Alias kept for backwards compat */
export const fmtDate = formatDate;

export function formatDateTime(date: string | Date | null | undefined, locale: string): string {
  if (!date) return '-';
  return new Date(date).toLocaleString(intlLocale(locale));
}

/** Alias kept for backwards compat */
export const fmtDateTime = formatDateTime;

export function formatNumber(value: number, locale: string): string {
  return value.toLocaleString(intlLocale(locale));
}

/** Null-safe decimal formatter (2 decimal places) */
export function fmtAmount(value: number | null | undefined, locale: string): string {
  if (value == null) return '-';
  return value.toLocaleString(intlLocale(locale), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
