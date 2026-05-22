'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ChevronLeft } from 'lucide-react';

interface PO {
  id: string;
  poNumber: string;
  status: string;
  supplier: { name: string };
  items: Array<{ id: string; description: string; quantity: number; receivedQty: number; unit: string | null; unitPrice: number }>;
}

interface ReceiptItem {
  purchaseOrderItemId: string;
  description: string;
  orderedQty: string;
  receivedQty: string;
  unit: string;
}

export default function NewReceiptPage() {
  const { locale } = useParams() as { locale: string };
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPOId = searchParams.get('poId') || '';
  const [saving, setSaving] = useState(false);
  const [pos, setPOs] = useState<PO[]>([]);
  const [selectedPO, setSelectedPO] = useState<PO | null>(null);
  const [selectedPOId, setSelectedPOId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ReceiptItem[]>([]);

  useEffect(() => {
    fetch('/api/purchase-orders?limit=200')
      .then(r => r.json())
      .then(res => {
        const list: PO[] = (res.data || []).filter((p: PO) =>
          ['SENT', 'CONFIRMED', 'PARTIALLY_RECEIVED'].includes(p.status)
        );
        setPOs(list);
        if (preselectedPOId) {
          const found = list.find(p => p.id === preselectedPOId);
          if (found) {
            setSelectedPOId(found.id);
            setSelectedPO(found);
            if (found.items) {
              setItems(found.items.map(item => ({
                purchaseOrderItemId: item.id,
                description: item.description,
                orderedQty: String(item.quantity),
                receivedQty: String(item.quantity - item.receivedQty),
                unit: item.unit || '',
              })));
            }
          }
        }
      });
  }, [preselectedPOId]);

  const handlePOSelect = (poId: string) => {
    setSelectedPOId(poId);
    const po = pos.find(p => p.id === poId) || null;
    setSelectedPO(po);
    if (po?.items) {
      setItems(po.items.map(item => ({
        purchaseOrderItemId: item.id,
        description: item.description,
        orderedQty: String(item.quantity),
        receivedQty: String(item.quantity - item.receivedQty),
        unit: item.unit || '',
      })));
    } else {
      setItems([]);
    }
  };

  const updateItem = (i: number, k: keyof ReceiptItem, v: string) =>
    setItems(p => p.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)));

  const submit = async () => {
    if (!selectedPOId) return toast.error('Select a Purchase Order');
    if (items.some(i => parseFloat(i.receivedQty) < 0)) return toast.error('Received qty cannot be negative');
    setSaving(true);
    const res = await fetch('/api/procurement/receipts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purchaseOrderId: selectedPOId, notes, items }),
    });
    if (res.ok) {
      const { data } = await res.json();
      toast.success(`GRN ${data.grnNumber} created`);
      router.push(`/${locale}/procurement/receipts`);
    } else {
      const d = await res.json();
      toast.error(d.error || 'Failed to create receipt');
      setSaving(false);
    }
  };

  const inp = 'w-full h-9 px-3 text-[13px] border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20';
  const sel = `${inp} cursor-pointer`;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/${locale}/procurement/receipts`} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">New Goods Receipt</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">Record received items against a Purchase Order</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">Select Purchase Order</h2>
        <div>
          <label className="block text-[12px] font-medium text-muted-foreground mb-1.5">Purchase Order *</label>
          <select className={sel} value={selectedPOId} onChange={e => handlePOSelect(e.target.value)}>
            <option value="">Select PO...</option>
            {pos.map(po => (
              <option key={po.id} value={po.id}>
                {po.poNumber} — {po.supplier.name} ({po.status})
              </option>
            ))}
          </select>
          {pos.length === 0 && (
            <p className="text-[12px] text-muted-foreground mt-1.5">
              No POs in SENT, CONFIRMED, or PARTIALLY_RECEIVED status.
            </p>
          )}
        </div>
        <div>
          <label className="block text-[12px] font-medium text-muted-foreground mb-1.5">Notes</label>
          <textarea
            className={`${inp} h-16 py-2 resize-none`}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Any notes about this delivery..."
          />
        </div>
      </div>

      {selectedPO && items.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <h2 className="text-[14px] font-semibold">Items to Receive</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">{selectedPO.supplier.name}</p>
          </div>
          <div className="p-5 space-y-3">
            <div className="grid grid-cols-12 gap-2 text-[11px] font-medium text-muted-foreground">
              <div className="col-span-5">Description</div>
              <div className="col-span-2">Ordered</div>
              <div className="col-span-2">Unit</div>
              <div className="col-span-3">Received Qty *</div>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <input className={`${inp} bg-muted/30`} value={item.description} readOnly />
                  </div>
                  <div className="col-span-2">
                    <input className={`${inp} bg-muted/30`} value={item.orderedQty} readOnly />
                  </div>
                  <div className="col-span-2">
                    <input className={inp} value={item.unit} onChange={e => updateItem(i, 'unit', e.target.value)} placeholder="Unit" />
                  </div>
                  <div className="col-span-3">
                    <input
                      className={inp}
                      type="number"
                      value={item.receivedQty}
                      onChange={e => updateItem(i, 'receivedQty', e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3 justify-end">
        <Button variant="outline" asChild>
          <Link href={`/${locale}/procurement/receipts`}>Cancel</Link>
        </Button>
        <Button onClick={submit} disabled={saving || !selectedPOId}>
          {saving ? 'Creating...' : 'Create Receipt'}
        </Button>
      </div>
    </div>
  );
}
