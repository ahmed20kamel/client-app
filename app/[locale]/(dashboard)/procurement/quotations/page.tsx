'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { FileSearch } from 'lucide-react';

const STATUS_COLOR: Record<string, string> = {
  RECEIVED: 'bg-gray-100 text-gray-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

interface SQ {
  id: string;
  sqNumber: string;
  status: string;
  total: number;
  receivedAt: string;
  supplier: { id: string; name: string };
  purchaseRequest: { id: string; prNumber: string; title: string };
  _count: { items: number };
}

export default function QuotationsListPage() {
  const { locale } = useParams() as { locale: string };
  const [data, setData] = useState<SQ[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/procurement/supplier-quotations')
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
      <div>
        <h1 className="text-xl font-bold">Supplier Quotations</h1>
        <p className="text-[12px] text-muted-foreground mt-0.5">{data.length} quotations</p>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-muted-foreground text-[13px]">Loading...</div>
        ) : data.length === 0 ? (
          <div className="py-16 text-center">
            <FileSearch className="size-10 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-[13px] text-muted-foreground">No quotations yet</p>
            <p className="text-[12px] text-muted-foreground mt-1">Add quotations from a Purchase Request</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-muted/30 border-b border-border">
                <tr>
                  {['SQ Number', 'PR', 'Supplier', 'Items', 'Total', 'Date', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map((sq) => (
                  <tr key={sq.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-primary">{sq.sqNumber}</td>
                    <td className="px-4 py-3">
                      <Link href={`/${locale}/procurement/requests/${sq.purchaseRequest.id}`} className="hover:underline text-primary">
                        {sq.purchaseRequest.prNumber}
                      </Link>
                      <p className="text-[11px] text-muted-foreground truncate max-w-[140px]">{sq.purchaseRequest.title}</p>
                    </td>
                    <td className="px-4 py-3 font-medium">{sq.supplier.name}</td>
                    <td className="px-4 py-3 text-center">{sq._count.items}</td>
                    <td className="px-4 py-3 font-medium">AED {fmt(sq.total)}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(sq.receivedAt).toLocaleDateString('en-AE')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_COLOR[sq.status] || 'bg-gray-100 text-gray-600'}`}>
                        {sq.status}
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
