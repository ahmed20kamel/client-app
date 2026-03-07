'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Loader2, UserCheck } from 'lucide-react';

interface CustomerResult {
  id: string;
  fullName: string;
  fullNameAr: string | null;
  phone: string;
  email: string | null;
  company: string | null;
  contactPerson: string | null;
  nationalId: string | null;
  customerType: string;
  emirate: string | null;
  projectType: string | null;
  productType: string | null;
  leadSource: string | null;
  estimatedValue: number | null;
  probability: number | null;
  consultant: string | null;
  paymentTerms: string | null;
  projectSize: number | null;
  notes: string | null;
}

interface CustomerAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (customer: CustomerResult) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  dir?: string;
}

export function CustomerAutocomplete({
  value,
  onChange,
  onSelect,
  disabled,
  className,
  placeholder,
  dir,
}: CustomerAutocompleteProps) {
  const t = useTranslations();
  const [results, setResults] = useState<CustomerResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>(null);

  const searchCustomers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(query)}&limit=8`);
      const data = await res.json();
      setResults(data.data || []);
      setIsOpen(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      onChange(val);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => searchCustomers(val), 300);
    },
    [onChange, searchCustomers]
  );

  const handleSelect = useCallback(
    (customer: CustomerResult) => {
      onChange(customer.fullName);
      setIsOpen(false);
      setResults([]);
      onSelect(customer);
    },
    [onChange, onSelect]
  );

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={value}
        onChange={handleInputChange}
        onFocus={() => {
          if (results.length > 0) setIsOpen(true);
        }}
        disabled={disabled}
        className={className}
        placeholder={placeholder}
        dir={dir}
        autoComplete="off"
      />
      {loading && (
        <Loader2 className="absolute end-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground animate-spin" />
      )}

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          <div className="px-3 py-2 text-xs text-muted-foreground border-b">
            {t('customers.existingCustomers')}
          </div>
          {results.map((customer) => (
            <button
              key={customer.id}
              type="button"
              className="w-full text-start px-3 py-2.5 hover:bg-secondary/50 transition-colors flex items-center gap-3 border-b border-border/50 last:border-0"
              onClick={() => handleSelect(customer)}
            >
              <UserCheck className="size-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{customer.fullName}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {customer.fullNameAr && (
                    <span className="truncate">{customer.fullNameAr}</span>
                  )}
                  {customer.phone && (
                    <span dir="ltr">{customer.phone}</span>
                  )}
                  {customer.company && (
                    <>
                      <span>-</span>
                      <span className="truncate">{customer.company}</span>
                    </>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
