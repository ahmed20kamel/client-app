'use client';

import { useState, forwardRef, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const COUNTRIES = [
  { code: 'AE', flag: '🇦🇪', name: 'UAE',          nameAr: 'الإمارات',    dial: '+971', maxDigits: 9  },
  { code: 'SA', flag: '🇸🇦', name: 'Saudi Arabia', nameAr: 'السعودية',    dial: '+966', maxDigits: 9  },
  { code: 'KW', flag: '🇰🇼', name: 'Kuwait',       nameAr: 'الكويت',      dial: '+965', maxDigits: 8  },
  { code: 'OM', flag: '🇴🇲', name: 'Oman',         nameAr: 'عُمان',       dial: '+968', maxDigits: 8  },
  { code: 'QA', flag: '🇶🇦', name: 'Qatar',        nameAr: 'قطر',         dial: '+974', maxDigits: 8  },
  { code: 'BH', flag: '🇧🇭', name: 'Bahrain',      nameAr: 'البحرين',     dial: '+973', maxDigits: 8  },
  { code: 'JO', flag: '🇯🇴', name: 'Jordan',       nameAr: 'الأردن',      dial: '+962', maxDigits: 9  },
  { code: 'EG', flag: '🇪🇬', name: 'Egypt',        nameAr: 'مصر',         dial: '+20',  maxDigits: 10 },
  { code: 'LB', flag: '🇱🇧', name: 'Lebanon',      nameAr: 'لبنان',       dial: '+961', maxDigits: 8  },
  { code: 'IN', flag: '🇮🇳', name: 'India',        nameAr: 'الهند',       dial: '+91',  maxDigits: 10 },
  { code: 'PK', flag: '🇵🇰', name: 'Pakistan',     nameAr: 'باكستان',     dial: '+92',  maxDigits: 10 },
  { code: 'BD', flag: '🇧🇩', name: 'Bangladesh',   nameAr: 'بنغلاديش',   dial: '+880', maxDigits: 10 },
  { code: 'NP', flag: '🇳🇵', name: 'Nepal',        nameAr: 'نيبال',       dial: '+977', maxDigits: 10 },
  { code: 'LK', flag: '🇱🇰', name: 'Sri Lanka',    nameAr: 'سريلانكا',   dial: '+94',  maxDigits: 9  },
  { code: 'PH', flag: '🇵🇭', name: 'Philippines',  nameAr: 'الفلبين',    dial: '+63',  maxDigits: 10 },
  { code: 'GB', flag: '🇬🇧', name: 'UK',           nameAr: 'بريطانيا',   dial: '+44',  maxDigits: 10 },
  { code: 'US', flag: '🇺🇸', name: 'USA / Canada', nameAr: 'أمريكا',      dial: '+1',   maxDigits: 10 },
] as const;

type Country = typeof COUNTRIES[number];

const GCC_CODES = ['AE', 'SA', 'KW', 'OM', 'QA', 'BH'];

function parsePhone(value: string): { country: Country; local: string } {
  const uae = COUNTRIES[0];
  if (!value) return { country: uae, local: '' };
  const sorted = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  for (const c of sorted) {
    if (value.startsWith(c.dial)) {
      return { country: c, local: value.slice(c.dial.length) };
    }
  }
  return { country: uae, local: '' };
}

interface PhoneInputProps {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value = '', onChange, disabled, className }, ref) => {
    const parsed = parsePhone(value);
    const [country, setCountry] = useState<Country>(parsed.country);
    const [local, setLocal] = useState(parsed.local);
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    // Sync from parent
    useEffect(() => {
      const p = parsePhone(value);
      setCountry(p.country);
      setLocal(p.local);
    }, [value]);

    // Close on outside click
    useEffect(() => {
      if (!open) return;
      const handler = (e: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
          setOpen(false);
          setSearch('');
        }
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    // Focus search when opened
    useEffect(() => {
      if (open) setTimeout(() => searchRef.current?.focus(), 50);
    }, [open]);

    const handleLocalChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      let digits = e.target.value.replace(/\D/g, '').slice(0, country.maxDigits);
      if (GCC_CODES.includes(country.code) && digits.startsWith('0')) digits = digits.slice(1);
      setLocal(digits);
      onChange?.(digits ? country.dial + digits : '');
    }, [country, onChange]);

    const handleCountrySelect = useCallback((c: Country) => {
      setCountry(c);
      setOpen(false);
      setSearch('');
      onChange?.(local ? c.dial + local : '');
    }, [local, onChange]);

    const filtered = COUNTRIES.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.nameAr.includes(search) ||
      c.dial.includes(search)
    );

    return (
      <div className={cn(
        'relative flex h-10 rounded-md border border-input bg-background text-sm ring-offset-background',
        'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}>
        {/* Country selector */}
        <div ref={dropdownRef} className="relative shrink-0">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setOpen(o => !o)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 h-full rounded-s-md transition-colors',
              'border-e border-input hover:bg-muted/60 active:bg-muted',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset'
            )}
          >
            <span className="text-base leading-none select-none">{country.flag}</span>
            <span className="text-xs text-muted-foreground font-mono font-medium tracking-tight">{country.dial}</span>
            <ChevronDown className={cn('size-3 text-muted-foreground/70 transition-transform duration-150', open && 'rotate-180')} />
          </button>

          {open && (
            <div className="absolute start-0 top-[calc(100%+4px)] z-50 w-64 rounded-xl border border-border bg-popover shadow-xl overflow-hidden">
              {/* Search */}
              <div className="p-2 border-b border-border/60">
                <div className="relative">
                  <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                  <input
                    ref={searchRef}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search country..."
                    className="w-full ps-8 pe-3 py-1.5 text-sm bg-muted/40 rounded-lg outline-none placeholder:text-muted-foreground/60"
                  />
                </div>
              </div>
              {/* Country list */}
              <div className="max-h-56 overflow-y-auto py-1">
                {filtered.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No results</p>
                ) : filtered.map(c => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => handleCountrySelect(c)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/60 transition-colors text-start',
                      c.code === country.code && 'bg-primary/10 text-primary font-medium'
                    )}
                  >
                    <span className="text-base leading-none">{c.flag}</span>
                    <div className="flex-1 min-w-0">
                      <span className="block truncate">{c.name}</span>
                      <span className="block text-[11px] text-muted-foreground" dir="rtl">{c.nameAr}</span>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono shrink-0">{c.dial}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Number input */}
        <input
          ref={ref}
          type="tel"
          inputMode="numeric"
          dir="ltr"
          disabled={disabled}
          value={local}
          onChange={handleLocalChange}
          placeholder={country.code === 'AE' ? '501234567' : '...'}
          className="flex-1 bg-transparent px-3 outline-none placeholder:text-muted-foreground/50 disabled:cursor-not-allowed font-mono tracking-wide"
        />
      </div>
    );
  }
);

PhoneInput.displayName = 'PhoneInput';
