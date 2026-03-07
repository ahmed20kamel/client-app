'use client';

import { forwardRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';

interface EmiratesIdInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

// Format: 784-XXXX-XXXXXXX-X (total 15 digits)
function formatEmiratesId(digits: string): string {
  let result = '';
  for (let i = 0; i < digits.length && i < 15; i++) {
    if (i === 3 || i === 7 || i === 14) {
      result += '-';
    }
    result += digits[i];
  }
  return result;
}

function stripToDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export const EmiratesIdInput = forwardRef<HTMLInputElement, EmiratesIdInputProps>(
  ({ value, onChange, disabled, className }, ref) => {
    const digits = stripToDigits(value || '');
    const displayValue = formatEmiratesId(digits);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        let newDigits = stripToDigits(raw);

        // Limit to 15 digits
        newDigits = newDigits.slice(0, 15);

        // Store formatted value
        onChange(formatEmiratesId(newDigits));
      },
      [onChange]
    );

    return (
      <Input
        ref={ref}
        type="text"
        dir="ltr"
        value={displayValue}
        onChange={handleChange}
        disabled={disabled}
        className={className}
        placeholder="784-XXXX-XXXXXXX-X"
        maxLength={18} // 15 digits + 3 dashes
      />
    );
  }
);

EmiratesIdInput.displayName = 'EmiratesIdInput';
