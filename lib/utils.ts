import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-AE' : 'en-AE', {
    style: 'currency',
    currency: 'AED',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(date: string | Date, locale: string): string {
  return new Date(date).toLocaleDateString(locale === 'ar' ? 'ar-AE' : 'en-AE');
}

export function formatDateTime(date: string | Date, locale: string): string {
  return new Date(date).toLocaleString(locale === 'ar' ? 'ar-AE' : 'en-AE');
}

export function formatNumber(value: number, locale: string): string {
  return value.toLocaleString(locale === 'ar' ? 'ar-AE' : 'en-AE');
}
