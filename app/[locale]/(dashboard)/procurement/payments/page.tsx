'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CreditCard } from 'lucide-react';

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  PAID: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

interface Payment {
  id: string;
  amount: number;
  method: string;
  paymentDate: string;
  reference: string | null;
  status: string;
  vendorInvoice: { id: string; ourRef: string; total: number };
  supplier: { id: string; name: string };
  createdBy: { fullName: string };
}

export default function PaymentsListPage() {
  const { locale } = useParams() as { locale: string };
  const [data, setData] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/procurement/payments')
      .then(r => r.json())
      .then(res => {
        setData(res.data || []);
        setLoading(false);
      });
  }, []);

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  const totalPaid = data.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Procurement Payments</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">{data.length} payments · Total: AED {fmt(totalPaid)}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-muted-foreground text-[13px]">Loading...</div>
        ) : data.length === 0 ? (
          <div className="py-16 text-center">
            <CreditCard className="size-10 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-[13px] text-muted-foreground">No payments recorded yet</p>
            <p className="text-[12px] text-muted-foreground mt-1">Payments are recorded from the Invoice detail page</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-muted/30 border-b border-border">
                <tr>
                  {['Invoice Ref', 'Supplier', 'Amount', 'Method', 'Reference', 'Payment Date', 'Recorded By', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map((pay) => (
                  <tr key={pay.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/${locale}/procurement/invoices/${pay.vendorInvoice.id}`}
                        className="font-mono font-semibold text-primary hover:underline"
                      >
                        {pay.vendorInvoice.ourRef}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium">{pay.supplier.name}</td>
                    <td className="px-4 py-3 font-semibold text-green-700">AED {fmt(pay.amount)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{pay.method}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-[12px]">{pay.reference || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(pay.paymentDate).toLocaleDateString('en-AE')}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{pay.createdBy?.fullName}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_COLOR[pay.status] || 'bg-gray-100 text-gray-600'}`}>
                        {pay.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-border bg-muted/10">
                <tr>
                  <td colSpan={2} className="px-4 py-3 font-semibold text-[13px]">Total</td>
                  <td className="px-4 py-3 font-bold text-green-700">AED {fmt(totalPaid)}</td>
                  <td colSpan={5} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
