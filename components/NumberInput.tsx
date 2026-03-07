'use client';

import { forwardRef, useCallback, useRef } from 'react';
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

function formatWithCommas(str: string): string {
  const parts = str.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

function stripCommas(str: string): string {
  return str.replace(/,/g, '');
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value, onChange, disabled, className, placeholder, min, max, step, suffix }, ref) => {
    const innerRef = useRef<HTMLInputElement>(null);
    const inputRef = (ref as React.RefObject<HTMLInputElement>) || innerRef;

    const displayValue = (() => {
      if (value === null || value === undefined) return '';
      const formatted = formatWithCommas(value.toString());
      return suffix ? `${formatted} ${suffix}` : formatted;
    })();

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target;
        const cursorPos = input.selectionStart ?? 0;
        const oldVal = input.value;

        // Count commas before cursor in old value
        const commasBefore = (oldVal.slice(0, cursorPos).match(/,/g) || []).length;

        const raw = stripCommas(oldVal);

        if (raw === '' || raw === '-') {
          onChange(null);
          return;
        }

        // Only allow digits and decimal point
        if (!/^-?\d*\.?\d*$/.test(raw)) return;

        const num = Number(raw);
        if (isNaN(num)) return;

        if (min !== undefined && num < min) return;
        if (max !== undefined && num > max) return;

        onChange(num);

        // Restore cursor position after React re-renders the formatted value
        requestAnimationFrame(() => {
          const el = inputRef.current;
          if (!el) return;

          const newVal = el.value;
          // Calculate new cursor: digits before cursor stayed the same,
          // but comma count may have changed
          const digitsBeforeCursor = cursorPos - commasBefore;
          let newPos = 0;
          let digitsSeen = 0;
          for (let i = 0; i < newVal.length; i++) {
            if (digitsSeen === digitsBeforeCursor) break;
            if (newVal[i] !== ',') digitsSeen++;
            newPos = i + 1;
          }

          el.setSelectionRange(newPos, newPos);
        });
      },
      [onChange, min, max, inputRef]
    );

    return (
      <Input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        dir="ltr"
        value={displayValue}
        onChange={handleChange}
        disabled={disabled}
        className={className}
        placeholder={placeholder}
        step={step}
      />
    );
  }
);

NumberInput.displayName = 'NumberInput';
