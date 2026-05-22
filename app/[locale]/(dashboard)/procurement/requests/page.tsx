'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

interface PR {
  id: string;
  prNumber: string;
  title: string;
  status: string;
  requiredDate: string | null;
  requestedBy: { id: string; fullName: string };
  approvedBy: { id: string; fullName: string } | null;
  _count: { items: number; supplierQuotes: number; purchaseOrders: number };
}

export default function PRListPage() {
  const { locale } = useParams() as { locale: string };
  const router = useRouter();
  const [data, setData] = useState<PR[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch('/api/procurement/requests')
      .then(r => r.json())
      .then(res => {
        setData(res.data || []);
        setLoading(false);
      });
  };
  useEffect(load, []);

  const submit = async (id: string) => {
    const res = await fetch(`/api/procurement/requests/${id}/submit`, { method: 'POST' });
    if (res.ok) { toast.success('Submitted for approval'); load(); }
    else toast.error('Failed to submit');
  };

  const approve = async (id: string, action: 'approve' | 'reject') => {
    const reason = action === 'reject' ? prompt('Rejection reason:') : undefined;
    const res = await fetch(`/api/procurement/requests/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reason }),
    });
    if (res.ok) { toast.success(action === 'approve' ? 'Approved' : 'Rejected'); load(); }
    else toast.error('Failed');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Purchase Requests</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">{data.length} requests</p>
        </div>
        <Button size="sm" onClick={() => router.push(`/${locale}/procurement/requests/new`)}>
          <Plus className="size-4 mr-1.5" /> New Request
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-muted-foreground text-[13px]">Loading...</div>
        ) : data.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="size-10 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-[13px] text-muted-foreground">No purchase requests yet</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => router.push(`/${locale}/procurement/requests/new`)}
            >
              Create first request
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-muted/30 border-b border-border">
                <tr>
                  {['PR Number', 'Title', 'Requested By', 'Required Date', 'Items', 'Quotes', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map((pr) => (
                  <tr key={pr.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-primary">
                      <Link href={`/${locale}/procurement/requests/${pr.id}`}>{pr.prNumber}</Link>
                    </td>
                    <td className="px-4 py-3 max-w-[200px] truncate">{pr.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{pr.requestedBy?.fullName}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {pr.requiredDate ? new Date(pr.requiredDate).toLocaleDateString('en-AE') : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">{pr._count?.items || 0}</td>
                    <td className="px-4 py-3 text-center">{pr._count?.supplierQuotes || 0}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_COLOR[pr.status] || 'bg-gray-100 text-gray-600'}`}>
                        {pr.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        {pr.status === 'DRAFT' && (
                          <Button size="sm" variant="outline" onClick={() => submit(pr.id)}>Submit</Button>
                        )}
                        {pr.status === 'SUBMITTED' && (
                          <>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => approve(pr.id, 'approve')}>Approve</Button>
                            <Button size="sm" variant="outline" className="text-red-600 border-red-200" onClick={() => approve(pr.id, 'reject')}>Reject</Button>
                          </>
                        )}
                        <Button size="sm" variant="ghost" asChild>
                          <Link href={`/${locale}/procurement/requests/${pr.id}`}>View</Link>
                        </Button>
                      </div>
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
