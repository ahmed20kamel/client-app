'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ComboboxOption { value: string; label: string; }

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  clearable?: boolean;
  disabled?: boolean;
}

export function Combobox({
  options, value, onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  className, clearable, disabled,
}: ComboboxProps) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find(o => o.value === value);
  const filtered = query
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (val: string) => { onChange(val); setOpen(false); setQuery(''); };

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className={cn(
          'w-full h-9 flex items-center justify-between gap-2 px-3 text-[13px] border border-border rounded-lg bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20',
          open ? 'border-primary/40 ring-2 ring-primary/20' : 'hover:bg-muted/30',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <span className={cn('truncate', selected ? 'text-foreground' : 'text-muted-foreground/50')}>
          {selected?.label ?? placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {clearable && value && (
            <span
              role="button"
              onClick={e => { e.stopPropagation(); onChange(''); }}
              className="p-0.5 rounded hover:bg-muted text-muted-foreground/50 hover:text-foreground transition-colors"
            >
              <X className="size-3" />
            </span>
          )}
          <ChevronsUpDown className="size-3.5 text-muted-foreground/40" />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 top-[calc(100%+4px)] left-0 min-w-full w-max max-w-xs bg-popover border border-border rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground pointer-events-none" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Escape') { setOpen(false); setQuery(''); }
                  if (e.key === 'Enter' && filtered.length === 1) select(filtered[0].value);
                }}
                placeholder={searchPlaceholder}
                className="w-full h-7 pl-7 pr-3 text-[12px] bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="text-center text-[12px] text-muted-foreground py-5">No results</p>
            ) : filtered.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => select(opt.value)}
                className={cn(
                  'w-full flex items-center justify-between gap-3 px-3 py-1.5 text-[13px] hover:bg-muted/60 transition-colors text-left',
                  opt.value === value ? 'text-primary bg-primary/5 font-medium' : 'text-foreground',
                )}
              >
                <span>{opt.label}</span>
                {opt.value === value && <Check className="size-3.5 text-primary shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
