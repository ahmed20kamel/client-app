'use client';

import { forwardRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChange, disabled, className }, ref) => {
    // Ensure value always starts with +971
    const displayValue = value.startsWith('+971') ? value : '+971';

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        let raw = e.target.value;

        // Don't allow removing the +971 prefix
        if (!raw.startsWith('+971')) {
          raw = '+971';
        }

        // Get the part after +971
        let afterPrefix = raw.slice(4);

        // Strip leading zero (user might type 05x, we want 5x after +971)
        if (afterPrefix.startsWith('0')) {
          afterPrefix = afterPrefix.slice(1);
        }

        // Only allow digits after prefix
        afterPrefix = afterPrefix.replace(/\D/g, '');

        // Limit to 9 digits after +971 (UAE numbers are 9 digits)
        afterPrefix = afterPrefix.slice(0, 9);

        onChange('+971' + afterPrefix);
      },
      [onChange]
    );

    return (
      <Input
        ref={ref}
        type="tel"
        dir="ltr"
        value={displayValue}
        onChange={handleChange}
        disabled={disabled}
        className={className}
      />
    );
  }
);

PhoneInput.displayName = 'PhoneInput';
