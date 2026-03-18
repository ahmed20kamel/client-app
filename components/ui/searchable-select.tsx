'use client';

import * as React from 'react';
import { ChevronDownIcon, Search, Check, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
  allowCreate?: boolean;
  onCreateOption?: (inputValue: string) => void;
  createLabel?: string;
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  disabled = false,
  className,
  icon,
  allowCreate = false,
  onCreateOption,
  createLabel,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const filteredOptions = React.useMemo(() => {
    if (!search) return options;
    const lower = search.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(lower) || o.value.toLowerCase().includes(lower));
  }, [options, search]);

  const selectedLabel = React.useMemo(() => {
    return options.find((o) => o.value === value)?.label || (value || undefined);
  }, [options, value]);

  const canCreate = React.useMemo(() => {
    if (!allowCreate || !search.trim()) return false;
    const lower = search.toLowerCase().trim();
    return !options.some((o) => o.label.toLowerCase() === lower || o.value.toLowerCase() === lower);
  }, [allowCreate, search, options]);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  React.useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleCreate = () => {
    const trimmed = search.trim();
    if (!trimmed) return;
    if (onCreateOption) {
      onCreateOption(trimmed);
    }
    onValueChange(trimmed);
    setOpen(false);
    setSearch('');
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(!open)}
        className={cn(
          'border-input data-[placeholder]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50 flex w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 h-9',
          !value && 'text-muted-foreground'
        )}
      >
        <span className="flex items-center gap-2 truncate">
          {icon}
          {selectedLabel || placeholder}
        </span>
        <div className="flex items-center gap-1">
          {value && (
            <span
              role="button"
              tabIndex={-1}
              className="hover:text-foreground text-muted-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onValueChange('');
                setSearch('');
              }}
            >
              <X className="size-3.5" />
            </span>
          )}
          <ChevronDownIcon className="size-4 opacity-50 shrink-0" />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
          <div className="flex items-center border-b px-2">
            <Search className="size-3.5 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canCreate) {
                  e.preventDefault();
                  handleCreate();
                }
              }}
              placeholder={searchPlaceholder}
              className="flex-1 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto p-1">
            {filteredOptions.map((option) => (
              <div
                key={option.value}
                onClick={() => {
                  onValueChange(option.value);
                  setOpen(false);
                  setSearch('');
                }}
                className={cn(
                  'relative flex w-full cursor-pointer items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm select-none hover:bg-accent hover:text-accent-foreground',
                  value === option.value && 'bg-accent/50'
                )}
              >
                {option.label}
                {value === option.value && (
                  <span className="absolute right-2 flex size-3.5 items-center justify-center">
                    <Check className="size-4" />
                  </span>
                )}
              </div>
            ))}

            {filteredOptions.length === 0 && !canCreate && (
              <div className="py-3 text-center text-xs text-muted-foreground">
                No results found
              </div>
            )}

            {canCreate && (
              <div
                onClick={handleCreate}
                className="flex w-full cursor-pointer items-center gap-2 rounded-sm py-1.5 px-2 text-sm select-none hover:bg-primary/10 hover:text-primary text-primary border-t mt-1 pt-2"
              >
                <Plus className="size-3.5" />
                <span>{createLabel || 'Add'}: <strong>{search.trim()}</strong></span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
