'use client';

interface StatusBadgeProps {
  status: string;
  label: string;
  config?: Record<string, { color: string; bg: string }>;
  size?: 'sm' | 'md';
}

const DEFAULT_CONFIG: Record<string, { color: string; bg: string }> = {
  NEW_INQUIRY: { color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  QUOTATION_SENT: { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  TECHNICAL_DISCUSSION: { color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  NEGOTIATION: { color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  FINAL_OFFER: { color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
  VERBAL_APPROVAL: { color: 'text-teal-700', bg: 'bg-teal-50 border-teal-200' },
  WON: { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  LOST: { color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  // Generic statuses
  ACTIVE: { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  DISABLED: { color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  OPEN: { color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  IN_PROGRESS: { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  DONE: { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  OVERDUE: { color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  CANCELED: { color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' },
  SUBMITTED: { color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  APPROVED: { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  REJECTED: { color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  // Priority levels
  LOW: { color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' },
  MEDIUM: { color: 'text-gray-800', bg: 'bg-gray-100 border-gray-300' },
  HIGH: { color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  URGENT: { color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
};

export function StatusBadge({ status, label, config, size = 'md' }: StatusBadgeProps) {
  const statusConfig = config || DEFAULT_CONFIG;
  const conf = statusConfig[status] || { color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' };
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs';

  return (
    <span className={`inline-flex items-center ${sizeClass} rounded-full font-medium border ${conf.bg} ${conf.color}`}>
      {label}
    </span>
  );
}
