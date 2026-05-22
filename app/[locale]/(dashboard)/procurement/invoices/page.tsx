'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STATUS_COLOR: Record<string, string> = {
  RECEIVED: 'bg-gray-100 text-gray-700',
  MATCHED: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-violet-100 text-violet-700',
  PAID: 'bg-green-100 text-green-700',
  DISPUTED: 'bg-red-100 text-red-700',
};

interface VendorInvoice {
  id: string;
  ourRef: string;
  vendorInvoiceNo: string | null;
  status: string;
  invoiceDate: string;
  total: number;
  paidAmount: number;
  supplier: { id: string; name: string };
  purchaseOrder: { id: string; poNumber: string };
  _count: { items: number; payments: number };
}

export default function InvoicesListPage() {
  const { locale } = useParams() as { locale: string };
  const router = useRouter();
  const [data, setData] = useState<VendorInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/procurement/invoices')
      .then(r => r.json())
      .then(res => {
        setData(res.data || []);
        setLoading(false);
      });
  }, []);

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Vendor Invoices</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">{data.length} invoices</p>
        </div>
        <Button size="sm" onClick={() => router.push(`/${locale}/procurement/invoices/new`)}>
          <Plus className="size-4 mr-1.5" /> New Invoice
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-muted-foreground text-[13px]">Loading...</div>
        ) : data.length === 0 ? (
          <div className="py-16 text-center">
            <Receipt className="size-10 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-[13px] text-muted-foreground">No vendor invoices yet</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => router.push(`/${locale}/procurement/invoices/new`)}
            >
              Record first invoice
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-muted/30 border-b border-border">
                <tr>
                  {['Our Ref', 'Vendor Invoice No', 'LLPO Number', 'Supplier', 'Date', 'Total', 'Paid', 'Balance', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => router.push(`/${locale}/procurement/invoices/${inv.id}`)}
                  >
                    <td className="px-4 py-3 font-mono font-semibold text-primary">{inv.ourRef}</td>
                    <td className="px-4 py-3 text-muted-foreground">{inv.vendorInvoiceNo || '—'}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/${locale}/purchase-orders/${inv.purchaseOrder.id}`}
                        className="hover:underline text-primary font-mono"
                        onClick={e => e.stopPropagation()}
                      >
                        {inv.purchaseOrder.poNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium">{inv.supplier.name}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(inv.invoiceDate).toLocaleDateString('en-AE')}
                    </td>
                    <td className="px-4 py-3 font-medium">AED {fmt(inv.total)}</td>
                    <td className="px-4 py-3 text-green-700">AED {fmt(inv.paidAmount)}</td>
                    <td className={`px-4 py-3 font-medium ${inv.total - inv.paidAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      AED {fmt(inv.total - inv.paidAmount)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_COLOR[inv.status] || 'bg-gray-100 text-gray-600'}`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
