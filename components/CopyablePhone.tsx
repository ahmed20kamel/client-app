'use client';

import { useState, useCallback } from 'react';
import { Check, Copy } from 'lucide-react';

interface CopyablePhoneProps {
  phone: string;
  className?: string;
}

export function CopyablePhone({ phone, className }: CopyablePhoneProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }, [phone]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`group/phone inline-flex items-center gap-1.5 text-sm text-foreground hover:text-primary transition-colors cursor-pointer ${className || ''}`}
      title={phone}
      dir="ltr"
    >
      <span>{phone}</span>
      {copied ? (
        <Check className="size-3 text-success shrink-0" />
      ) : (
        <Copy className="size-3 opacity-0 group-hover/phone:opacity-50 transition-opacity shrink-0" />
      )}
    </button>
  );
}
