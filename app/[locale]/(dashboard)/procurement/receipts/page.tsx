'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  PARTIALLY_RECEIVED: 'bg-yellow-100 text-yellow-700',
  FULLY_RECEIVED: 'bg-green-100 text-green-700',
};

interface GRN {
  id: string;
  grnNumber: string;
  status: string;
  receivedAt: string | null;
  createdAt: string;
  purchaseOrder: { id: string; poNumber: string; supplier: { name: string } };
  receivedBy: { fullName: string };
  _count: { items: number };
}

export default function ReceiptsListPage() {
  const { locale } = useParams() as { locale: string };
  const router = useRouter();
  const [data, setData] = useState<GRN[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/procurement/receipts')
      .then(r => r.json())
      .then(res => {
        setData(res.data || []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Goods Receipts</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">{data.length} receipts</p>
        </div>
        <Button size="sm" onClick={() => router.push(`/${locale}/procurement/receipts/new`)}>
          <Plus className="size-4 mr-1.5" /> New Receipt
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-muted-foreground text-[13px]">Loading...</div>
        ) : data.length === 0 ? (
          <div className="py-16 text-center">
            <Truck className="size-10 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-[13px] text-muted-foreground">No goods receipts yet</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => router.push(`/${locale}/procurement/receipts/new`)}
            >
              Record first receipt
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-muted/30 border-b border-border">
                <tr>
                  {['GRN Number', 'PO Number', 'Supplier', 'Received By', 'Date', 'Items', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map((grn) => (
                  <tr key={grn.id} className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => router.push(`/${locale}/procurement/receipts/${grn.id}`)}>
                    <td className="px-4 py-3 font-mono font-semibold text-primary">{grn.grnNumber}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/${locale}/purchase-orders/${grn.purchaseOrder.id}`}
                        className="hover:underline"
                        onClick={e => e.stopPropagation()}
                      >
                        {grn.purchaseOrder.poNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{grn.purchaseOrder.supplier.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{grn.receivedBy?.fullName}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {grn.receivedAt ? new Date(grn.receivedAt).toLocaleDateString('en-AE') : new Date(grn.createdAt).toLocaleDateString('en-AE')}
                    </td>
                    <td className="px-4 py-3 text-center">{grn._count.items}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_COLOR[grn.status] || 'bg-gray-100 text-gray-600'}`}>
                        {grn.status.replace('_', ' ')}
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
