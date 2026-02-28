'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'size-4',
  md: 'size-6',
  lg: 'size-8',
};

export function StarRating({ value, onChange, readOnly = false, size = 'md' }: StarRatingProps) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          className={`${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-all`}
          onMouseEnter={() => !readOnly && setHover(star)}
          onMouseLeave={() => !readOnly && setHover(0)}
          onClick={() => onChange?.(star)}
        >
          <Star
            className={`${sizeClasses[size]} ${
              (hover || value) >= star
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-muted-foreground/30'
            } transition-colors`}
          />
        </button>
      ))}
    </div>
  );
}
