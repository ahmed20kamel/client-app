'use client';

import { forwardRef, useCallback, useState } from 'react';
import { Input } from '@/components/ui/input';

interface NumberInputProps {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}

function formatWithCommas(num: number): string {
  const parts = num.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

function stripCommas(str: string): string {
  return str.replace(/,/g, '');
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value, onChange, disabled, className, placeholder, min, max, step, suffix }, ref) => {
    const [focused, setFocused] = useState(false);

    // When focused, show raw number for easy editing
    // When blurred, show formatted with commas
    const displayValue = (() => {
      if (value === null || value === undefined) return '';
      if (focused) return value.toString();
      const formatted = formatWithCommas(value);
      return suffix ? `${formatted} ${suffix}` : formatted;
    })();

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = stripCommas(e.target.value);

        if (raw === '' || raw === '-') {
          onChange(null);
          return;
        }

        const num = Number(raw);
        if (isNaN(num)) return;

        if (min !== undefined && num < min) return;
        if (max !== undefined && num > max) return;

        onChange(num);
      },
      [onChange, min, max]
    );

    const handleFocus = useCallback(() => setFocused(true), []);
    const handleBlur = useCallback(() => setFocused(false), []);

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        dir="ltr"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        className={className}
        placeholder={placeholder}
        step={step}
      />
    );
  }
);

NumberInput.displayName = 'NumberInput';
