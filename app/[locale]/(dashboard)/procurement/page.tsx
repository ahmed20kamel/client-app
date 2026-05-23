'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { FileText, ShoppingCart, Truck, Receipt, CreditCard, ArrowRight, Users, Package } from 'lucide-react';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-AE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

export default function ProcurementOverview() {
  const { locale } = useParams() as { locale: string };
  const [stats, setStats] = useState({
    openPRs: 0,
    activePOs: 0,
    pendingGRNs: 0,
    unpaidInvoicesTotal: 0,
    pendingPayments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/procurement/requests').then(r => r.json()),
      fetch('/api/purchase-orders').then(r => r.json()),
      fetch('/api/procurement/receipts').then(r => r.json()),
      fetch('/api/procurement/invoices').then(r => r.json()),
      fetch('/api/procurement/payments').then(r => r.json()),
    ]).then(([prs, pos, grns, invs, pays]) => {
      setStats({
        openPRs: (prs.data || []).filter((p: { status: string }) => p.status === 'SUBMITTED').length,
        activePOs: (pos.data || []).filter((p: { status: string }) =>
          ['SENT', 'CONFIRMED', 'PARTIALLY_RECEIVED'].includes(p.status)
        ).length,
        pendingGRNs: (grns.data || []).filter((g: { status: string }) => g.status === 'PENDING').length,
        unpaidInvoicesTotal: (invs.data || [])
          .filter((i: { status: string }) => ['RECEIVED', 'MATCHED', 'APPROVED'].includes(i.status))
          .reduce((s: number, i: { total: number; paidAmount: number }) => s + i.total - i.paidAmount, 0),
        pendingPayments: (pays.data || []).filter((p: { status: string }) => p.status === 'PENDING').length,
      });
      setLoading(false);
    });
  }, []);

  const cards = [
    { label: 'Awaiting Approval', value: stats.openPRs, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50', href: `/${locale}/procurement/requests` },
    { label: 'Active LPOs', value: stats.activePOs, icon: ShoppingCart, color: 'text-violet-600', bg: 'bg-violet-50', href: `/${locale}/procurement/orders` },
    { label: 'Pending GRNs', value: stats.pendingGRNs, icon: Truck, color: 'text-orange-600', bg: 'bg-orange-50', href: `/${locale}/procurement/receipts` },
    { label: 'Unpaid Invoices', value: `AED ${fmt(stats.unpaidInvoicesTotal)}`, icon: Receipt, color: 'text-red-600', bg: 'bg-red-50', href: `/${locale}/procurement/invoices` },
    { label: 'Pending Payments', value: stats.pendingPayments, icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-50', href: `/${locale}/procurement/payments` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Procurement</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Manage purchase requests, quotations, orders, receipts &amp; payments
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map(card => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-colors"
          >
            <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
              <card.icon className={`size-5 ${card.color}`} />
            </div>
            <p className="text-[22px] font-bold text-foreground tabular-nums">
              {loading ? '—' : card.value}
            </p>
            <p className="text-[12px] text-muted-foreground mt-0.5">{card.label}</p>
          </Link>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        <Link href={`/${locale}/suppliers`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-colors">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
            <Users className="size-5 text-blue-600" />
          </div>
          <div>
            <p className="text-[14px] font-semibold">Supplier List</p>
            <p className="text-[11px] text-muted-foreground">Manage vendors &amp; suppliers</p>
          </div>
        </Link>
        <Link href={`/${locale}/procurement/materials`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-colors">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Package className="size-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-[14px] font-semibold">Materials List</p>
            <p className="text-[11px] text-muted-foreground">Construction materials catalogue</p>
          </div>
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <h2 className="text-[14px] font-semibold">Procurement Flow</h2>
        </div>
        <div className="p-5 flex flex-wrap items-center gap-2 text-[13px]">
          {[
            'Purchase Request',
            'Supplier Quotations',
            'Purchase Order',
            'Goods Receipt',
            'Vendor Invoice',
            'Payment',
          ].map((step, i, arr) => (
            <span key={step} className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-full bg-muted text-foreground font-medium">{step}</span>
              {i < arr.length - 1 && <ArrowRight className="size-4 text-muted-foreground" />}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
