'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Plus, Trash2, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

interface Item {
  description: string;
  quantity: string;
  unit: string;
  estimatedPrice: string;
  notes: string;
}

export default function NewPRPage() {
  const { locale } = useParams() as { locale: string };
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', requiredDate: '', projectRef: '', notes: '' });
  const [items, setItems] = useState<Item[]>([
    { description: '', quantity: '1', unit: '', estimatedPrice: '', notes: '' },
  ]);

  const addItem = () =>
    setItems(p => [...p, { description: '', quantity: '1', unit: '', estimatedPrice: '', notes: '' }]);
  const removeItem = (i: number) => setItems(p => p.filter((_, idx) => idx !== i));
  const updateItem = (i: number, k: keyof Item, v: string) =>
    setItems(p => p.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)));

  const submit = async () => {
    if (!form.title.trim()) return toast.error('Title is required');
    if (items.some(i => !i.description.trim())) return toast.error('All items need a description');
    setSaving(true);
    const res = await fetch('/api/procurement/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, items }),
    });
    if (res.ok) {
      const { data } = await res.json();
      toast.success(`Created ${data.prNumber}`);
      router.push(`/${locale}/procurement/requests/${data.id}`);
    } else {
      toast.error('Failed to create request');
      setSaving(false);
    }
  };

  const inp = 'w-full h-9 px-3 text-[13px] border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/${locale}/procurement/requests`} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">New Purchase Request</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">Request materials or services</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">Request Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-[12px] font-medium text-muted-foreground mb-1.5">Title *</label>
            <input
              className={inp}
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Steel pipes for SC-P83"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-muted-foreground mb-1.5">Required By</label>
            <input
              type="date"
              className={inp}
              value={form.requiredDate}
              onChange={e => setForm(p => ({ ...p, requiredDate: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-muted-foreground mb-1.5">Project Reference</label>
            <input
              className={inp}
              value={form.projectRef}
              onChange={e => setForm(p => ({ ...p, projectRef: e.target.value }))}
              placeholder="e.g. SC-P83"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[12px] font-medium text-muted-foreground mb-1.5">Description</label>
            <textarea
              className={`${inp} h-20 py-2 resize-none`}
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Describe what you need..."
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[12px] font-medium text-muted-foreground mb-1.5">Notes</label>
            <textarea
              className={`${inp} h-16 py-2 resize-none`}
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Internal notes..."
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">Items</h2>
          <Button size="sm" variant="outline" onClick={addItem}>
            <Plus className="size-3.5 mr-1" />Add Item
          </Button>
        </div>
        <div className="grid grid-cols-12 gap-2 text-[11px] font-medium text-muted-foreground">
          <div className="col-span-5">Description</div>
          <div className="col-span-2">Qty</div>
          <div className="col-span-2">Unit</div>
          <div className="col-span-2">Est. Price</div>
          <div className="col-span-1" />
        </div>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-5">
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
                  placeholder="Qty"
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
              <div className="col-span-2">
                <input
                  className={inp}
                  type="number"
                  value={item.estimatedPrice}
                  onChange={e => updateItem(i, 'estimatedPrice', e.target.value)}
                  placeholder="Est. Price"
                  min="0"
                />
              </div>
              <div className="col-span-1 flex justify-end">
                <button
                  onClick={() => removeItem(i)}
                  className="text-muted-foreground hover:text-red-500 transition-colors"
                  disabled={items.length === 1}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <Button variant="outline" asChild>
          <Link href={`/${locale}/procurement/requests`}>Cancel</Link>
        </Button>
        <Button onClick={submit} disabled={saving}>
          {saving ? 'Creating...' : 'Create Request'}
        </Button>
      </div>
    </div>
  );
}
