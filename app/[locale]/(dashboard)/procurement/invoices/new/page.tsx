'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react';

interface PO {
  id: string;
  poNumber: string;
  status: string;
  supplierId: string;
  supplier: { id: string; name: string };
  items: Array<{ id: string; description: string; quantity: number; unitPrice: number; unit: string | null }>;
}

interface InvoiceItem {
  purchaseOrderItemId: string;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
}

export default function NewInvoicePage() {
  const { locale } = useParams() as { locale: string };
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [pos, setPOs] = useState<PO[]>([]);
  const [selectedPO, setSelectedPO] = useState<PO | null>(null);
  const [selectedPOId, setSelectedPOId] = useState('');
  const [form, setForm] = useState({
    vendorInvoiceNo: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    taxPercent: '5',
    notes: '',
  });
  const [items, setItems] = useState<InvoiceItem[]>([]);

  useEffect(() => {
    fetch('/api/purchase-orders?limit=200')
      .then(r => r.json())
      .then(res => {
        const list: PO[] = (res.data || []).filter((p: PO) =>
          ['CONFIRMED', 'SENT', 'PARTIALLY_RECEIVED', 'RECEIVED'].includes(p.status)
        );
        setPOs(list);
      });
  }, []);

  const handlePOSelect = (poId: string) => {
    setSelectedPOId(poId);
    const po = pos.find(p => p.id === poId) || null;
    setSelectedPO(po);
    if (po?.items) {
      setItems(po.items.map(item => ({
        purchaseOrderItemId: item.id,
        description: item.description,
        quantity: String(item.quantity),
        unit: item.unit || '',
        unitPrice: String(item.unitPrice),
      })));
    } else {
      setItems([]);
    }
  };

  const addItem = () =>
    setItems(p => [...p, { purchaseOrderItemId: '', description: '', quantity: '1', unit: '', unitPrice: '' }]);
  const removeItem = (i: number) => setItems(p => p.filter((_, idx) => idx !== i));
  const updateItem = (i: number, k: keyof InvoiceItem, v: string) =>
    setItems(p => p.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)));

  const subtotal = items.reduce((s, i) => s + (parseFloat(i.unitPrice || '0') * parseFloat(i.quantity || '1')), 0);
  const taxPercent = parseFloat(form.taxPercent || '5');
  const taxAmount = subtotal * taxPercent / 100;
  const total = subtotal + taxAmount;

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  const submit = async () => {
    if (!selectedPOId) return toast.error('Select a Purchase Order');
    if (!form.invoiceDate) return toast.error('Invoice date is required');
    if (items.some(i => !i.description.trim())) return toast.error('All items need a description');
    setSaving(true);
    const res = await fetch('/api/procurement/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        purchaseOrderId: selectedPOId,
        supplierId: selectedPO?.supplierId,
        items,
      }),
    });
    if (res.ok) {
      const { data } = await res.json();
      toast.success(`Invoice ${data.ourRef} created`);
      router.push(`/${locale}/procurement/invoices/${data.id}`);
    } else {
      const d = await res.json();
      toast.error(d.error || 'Failed to create invoice');
      setSaving(false);
    }
  };

  const inp = 'w-full h-9 px-3 text-[13px] border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20';
  const sel = `${inp} cursor-pointer`;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/${locale}/procurement/invoices`} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">New Vendor Invoice</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">Record a supplier invoice against a Purchase Order</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">Invoice Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-[12px] font-medium text-muted-foreground mb-1.5">Purchase Order *</label>
            <select className={sel} value={selectedPOId} onChange={e => handlePOSelect(e.target.value)}>
              <option value="">Select PO...</option>
              {pos.map(po => (
                <option key={po.id} value={po.id}>
                  {po.poNumber} — {po.supplier.name} ({po.status})
                </option>
              ))}
            </select>
          </div>
          {selectedPO && (
            <div className="md:col-span-2 p-3 rounded-lg bg-muted/30 text-[12px]">
              <span className="text-muted-foreground">Supplier: </span>
              <span className="font-medium">{selectedPO.supplier.name}</span>
            </div>
          )}
          <div>
            <label className="block text-[12px] font-medium text-muted-foreground mb-1.5">Vendor Invoice No</label>
            <input
              className={inp}
              value={form.vendorInvoiceNo}
              onChange={e => setForm(p => ({ ...p, vendorInvoiceNo: e.target.value }))}
              placeholder="Supplier's invoice number"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-muted-foreground mb-1.5">Invoice Date *</label>
            <input
              type="date"
              className={inp}
              value={form.invoiceDate}
              onChange={e => setForm(p => ({ ...p, invoiceDate: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-muted-foreground mb-1.5">Due Date</label>
            <input
              type="date"
              className={inp}
              value={form.dueDate}
              onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-muted-foreground mb-1.5">VAT %</label>
            <input
              type="number"
              className={inp}
              value={form.taxPercent}
              onChange={e => setForm(p => ({ ...p, taxPercent: e.target.value }))}
              min="0"
              max="100"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[12px] font-medium text-muted-foreground mb-1.5">Notes</label>
            <textarea
              className={`${inp} h-16 py-2 resize-none`}
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Any notes..."
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">Invoice Lines</h2>
          <Button size="sm" variant="outline" onClick={addItem}>
            <Plus className="size-3.5 mr-1" /> Add Line
          </Button>
        </div>
        <div className="grid grid-cols-12 gap-2 text-[11px] font-medium text-muted-foreground">
          <div className="col-span-4">Description</div>
          <div className="col-span-2">Qty</div>
          <div className="col-span-2">Unit</div>
          <div className="col-span-3">Unit Price (AED)</div>
          <div className="col-span-1" />
        </div>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-4">
                <input
                  className={inp}
                  value={item.description}
                  onChange={e => updateItem(i, 'description', e.target.value)}
                  placeholder="Description *"
                />
              </div>
              <div className="col-span-2">
                <input
                  className={inp}
                  type="number"
                  value={item.quantity}
                  onChange={e => updateItem(i, 'quantity', e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="col-span-2">
                <input
                  className={inp}
                  value={item.unit}
                  onChange={e => updateItem(i, 'unit', e.target.value)}
                  placeholder="Unit"
                />
              </div>
              <div className="col-span-3">
                <input
                  className={inp}
                  type="number"
                  value={item.unitPrice}
                  onChange={e => updateItem(i, 'unitPrice', e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="col-span-1 flex justify-end">
                <button
                  onClick={() => removeItem(i)}
                  className="text-muted-foreground hover:text-red-500 transition-colors"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-border space-y-1 text-[13px]">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>AED {fmt(subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">VAT ({taxPercent}%)</span><span>AED {fmt(taxAmount)}</span></div>
          <div className="flex justify-between font-semibold text-[14px]"><span>Total</span><span>AED {fmt(total)}</span></div>
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <Button variant="outline" asChild>
          <Link href={`/${locale}/procurement/invoices`}>Cancel</Link>
        </Button>
        <Button onClick={submit} disabled={saving}>
          {saving ? 'Creating...' : 'Create Invoice'}
        </Button>
      </div>
    </div>
  );
}
