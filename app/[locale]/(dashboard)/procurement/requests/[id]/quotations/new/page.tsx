'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react';

interface Supplier { id: string; name: string; }
interface PRItem { id: string; description: string; quantity: number; unit: string | null; }
interface QuoteItem {
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  purchaseRequestItemId: string;
}

export default function NewQuotationPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id: prId, locale } = use(params);
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [prItems, setPRItems] = useState<PRItem[]>([]);
  const [form, setForm] = useState({
    supplierId: '',
    validUntil: '',
    paymentTerms: '',
    deliveryDays: '',
    taxPercent: '5',
    notes: '',
  });
  const [items, setItems] = useState<QuoteItem[]>([]);

  useEffect(() => {
    fetch('/api/suppliers?limit=200').then(r => r.json()).then(res => {
      setSuppliers(res.data || []);
    });
    fetch(`/api/procurement/requests/${prId}`).then(r => r.json()).then(res => {
      const pr = res.data;
      if (pr?.items) {
        setPRItems(pr.items);
        setItems(
          pr.items.map((item: PRItem) => ({
            description: item.description,
            quantity: String(item.quantity),
            unit: item.unit || '',
            unitPrice: '',
            purchaseRequestItemId: item.id,
          }))
        );
      }
    });
  }, [prId]);

  const addItem = () =>
    setItems(p => [...p, { description: '', quantity: '1', unit: '', unitPrice: '', purchaseRequestItemId: '' }]);
  const removeItem = (i: number) => setItems(p => p.filter((_, idx) => idx !== i));
  const updateItem = (i: number, k: keyof QuoteItem, v: string) =>
    setItems(p => p.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)));

  const subtotal = items.reduce((s, i) => s + (parseFloat(i.unitPrice || '0') * parseFloat(i.quantity || '1')), 0);
  const taxPercent = parseFloat(form.taxPercent || '5');
  const taxAmount = subtotal * taxPercent / 100;
  const total = subtotal + taxAmount;

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  const submit = async () => {
    if (!form.supplierId) return toast.error('Select a supplier');
    if (items.some(i => !i.description.trim())) return toast.error('All items need a description');
    if (items.some(i => !i.unitPrice || parseFloat(i.unitPrice) <= 0)) return toast.error('All items need a unit price');
    setSaving(true);
    const res = await fetch('/api/procurement/supplier-quotations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, purchaseRequestId: prId, items }),
    });
    if (res.ok) {
      toast.success('Quotation added');
      router.push(`/${locale}/procurement/requests/${prId}`);
    } else {
      const d = await res.json();
      toast.error(d.error || 'Failed to add quotation');
      setSaving(false);
    }
  };

  const inp = 'w-full h-9 px-3 text-[13px] border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20';
  const sel = `${inp} cursor-pointer`;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/${locale}/procurement/requests/${prId}`} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">New Supplier Quotation</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">Record a supplier&apos;s quote for this request</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">Quotation Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-[12px] font-medium text-muted-foreground mb-1.5">Supplier *</label>
            <select
              className={sel}
              value={form.supplierId}
              onChange={e => setForm(p => ({ ...p, supplierId: e.target.value }))}
            >
              <option value="">Select supplier...</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-muted-foreground mb-1.5">Valid Until</label>
            <input
              type="date"
              className={inp}
              value={form.validUntil}
              onChange={e => setForm(p => ({ ...p, validUntil: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-muted-foreground mb-1.5">Delivery Days</label>
            <input
              type="number"
              className={inp}
              value={form.deliveryDays}
              onChange={e => setForm(p => ({ ...p, deliveryDays: e.target.value }))}
              placeholder="e.g. 14"
              min="0"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-muted-foreground mb-1.5">Payment Terms</label>
            <input
              className={inp}
              value={form.paymentTerms}
              onChange={e => setForm(p => ({ ...p, paymentTerms: e.target.value }))}
              placeholder="e.g. 30 days net"
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
              placeholder="Any notes about this quotation..."
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">Items</h2>
          <Button size="sm" variant="outline" onClick={addItem}>
            <Plus className="size-3.5 mr-1" /> Add Item
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
          <Link href={`/${locale}/procurement/requests/${prId}`}>Cancel</Link>
        </Button>
        <Button onClick={submit} disabled={saving}>
          {saving ? 'Saving...' : 'Save Quotation'}
        </Button>
      </div>
    </div>
  );
}
