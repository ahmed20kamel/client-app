'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react';

interface Supplier { id: string; name: string; }
interface Item { description: string; quantity: string; unit: string; unitPrice: string; }

export default function NewLPOPage() {
  const { locale } = useParams() as { locale: string };
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [form, setForm] = useState({
    supplierId: '',
    subject: '',
    notes: '',
    terms: '',
    expectedDate: '',
    taxPercent: '5',
  });
  const [items, setItems] = useState<Item[]>([
    { description: '', quantity: '1', unit: '', unitPrice: '' },
  ]);

  useEffect(() => {
    fetch('/api/suppliers?limit=500&status=ACTIVE')
      .then(r => r.json())
      .then(res => setSuppliers(res.data || []));
  }, []);

  const addItem = () => setItems(p => [...p, { description: '', quantity: '1', unit: '', unitPrice: '' }]);
  const removeItem = (i: number) => setItems(p => p.filter((_, idx) => idx !== i));
  const updateItem = (i: number, k: keyof Item, v: string) =>
    setItems(p => p.map((it, idx) => idx === i ? { ...it, [k]: v } : it));

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

    const res = await fetch('/api/purchase-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierId: form.supplierId,
        subject: form.subject || undefined,
        notes: form.notes || undefined,
        terms: form.terms || undefined,
        expectedDate: form.expectedDate || undefined,
        taxPercent: parseFloat(form.taxPercent),
        items: items.map(i => ({
          description: i.description,
          quantity: parseFloat(i.quantity),
          unit: i.unit || undefined,
          unitPrice: parseFloat(i.unitPrice),
        })),
      }),
    });

    if (res.ok) {
      const { data } = await res.json();
      toast.success(`LPO ${data.poNumber} created`);
      router.push(`/${locale}/procurement/orders/${data.id}`);
    } else {
      const d = await res.json();
      toast.error(d.error || 'Failed to create LPO');
      setSaving(false);
    }
  };

  const inp = 'w-full h-9 px-3 text-[13px] border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/${locale}/procurement/orders`} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">New Purchase Order</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">Create a direct LPO without a Purchase Request</p>
        </div>
      </div>

      {/* Order Details */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">Order Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-[12px] font-medium text-muted-foreground mb-1.5">Supplier *</label>
            <select className={`${inp} cursor-pointer`} value={form.supplierId} onChange={e => setForm(p => ({ ...p, supplierId: e.target.value }))}>
              <option value="">Select supplier...</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-[12px] font-medium text-muted-foreground mb-1.5">Subject</label>
            <input className={inp} value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="e.g. Supply of construction materials" />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-muted-foreground mb-1.5">Expected Delivery</label>
            <input type="date" className={inp} value={form.expectedDate} onChange={e => setForm(p => ({ ...p, expectedDate: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-muted-foreground mb-1.5">VAT %</label>
            <input type="number" className={inp} value={form.taxPercent} onChange={e => setForm(p => ({ ...p, taxPercent: e.target.value }))} min="0" max="100" />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-muted-foreground mb-1.5">Terms & Conditions</label>
            <textarea className={`${inp} h-16 py-2 resize-none`} value={form.terms} onChange={e => setForm(p => ({ ...p, terms: e.target.value }))} placeholder="Payment terms, delivery conditions..." />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-muted-foreground mb-1.5">Notes</label>
            <textarea className={`${inp} h-16 py-2 resize-none`} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Internal notes..." />
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">Line Items</h2>
          <Button size="sm" variant="outline" onClick={addItem}><Plus className="size-3.5 mr-1" /> Add Line</Button>
        </div>
        <div className="grid grid-cols-12 gap-2 text-[11px] font-medium text-muted-foreground px-1">
          <div className="col-span-5">Description *</div>
          <div className="col-span-2">Qty</div>
          <div className="col-span-2">Unit</div>
          <div className="col-span-2">Unit Price (AED) *</div>
          <div className="col-span-1" />
        </div>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-5">
                <input className={inp} value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} placeholder="Material / service description" />
              </div>
              <div className="col-span-2">
                <input className={inp} type="number" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} min="0.01" step="0.01" />
              </div>
              <div className="col-span-2">
                <input className={inp} value={item.unit} onChange={e => updateItem(i, 'unit', e.target.value)} placeholder="Nos / KG..." />
              </div>
              <div className="col-span-2">
                <input className={inp} type="number" value={item.unitPrice} onChange={e => updateItem(i, 'unitPrice', e.target.value)} placeholder="0.00" min="0" step="0.01" />
              </div>
              <div className="col-span-1 flex justify-end">
                {items.length > 1 && (
                  <button onClick={() => removeItem(i)} className="text-muted-foreground hover:text-red-500 transition-colors">
                    <Trash2 className="size-4" />
                  </button>
                )}
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
        <Button variant="outline" asChild><Link href={`/${locale}/procurement/orders`}>Cancel</Link></Button>
        <Button onClick={submit} disabled={saving}>{saving ? 'Creating...' : 'Create LPO'}</Button>
      </div>
    </div>
  );
}
