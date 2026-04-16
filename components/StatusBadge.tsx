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
  DELIVERED: { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  RETURNED: { color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  OVERDUE: { color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  CANCELED: { color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' },
  SUBMITTED: { color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  APPROVED: { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  CLIENT_APPROVED: { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  CLIENT_REJECTED: { color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  REJECTED: { color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  // Inventory statuses
  INACTIVE: { color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' },
  DISCONTINUED: { color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  // Stock movement types
  IN: { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  OUT: { color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  ADJUSTMENT: { color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  RETURN: { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  TRANSFER: { color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  // Priority levels
  LOW: { color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' },
  MEDIUM: { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  HIGH: { color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  URGENT: { color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  // Quotation/Invoice/PO statuses
  DRAFT: { color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' },
  SENT: { color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  EXPIRED: { color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  CONVERTED: { color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
  PARTIALLY_PAID: { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  PARTIAL: { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  UNPAID: { color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  PAID: { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  CANCELLED: { color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  CONFIRMED: { color: 'text-teal-700', bg: 'bg-teal-50 border-teal-200' },
  PARTIALLY_RECEIVED: { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  RECEIVED: { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
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
