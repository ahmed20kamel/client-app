'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Plus, Search, Pencil, Trash2, Package } from 'lucide-react';

interface Material {
  id: string;
  sku: string;
  name: string;
  unitOfMeasure: string;
}

function AddMaterialModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: '', unitOfMeasure: 'Nos' });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.name.trim()) return toast.error('Name is required');
    setSaving(true);

    // Get next SKU
    const res = await fetch('/api/procurement/materials');
    const data = await res.json();
    const items: Material[] = data.data || [];
    const maxNum = items.reduce((max, m) => {
      const n = parseInt(m.sku.replace('MAT-', '')) || 0;
      return n > max ? n : max;
    }, 0);
    const sku = `MAT-${String(maxNum + 1).padStart(3, '0')}`;

    const r = await fetch('/api/procurement/materials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, sku, unitOfMeasure: form.unitOfMeasure }),
    });
    if (r.ok) {
      toast.success('Material added');
      onSaved();
      onClose();
    } else {
      const d = await r.json();
      toast.error(d.error || 'Failed to add');
      setSaving(false);
    }
  };

  const inp = 'w-full h-9 px-3 text-[13px] border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20';

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl border border-border shadow-xl w-full max-w-sm p-5 space-y-4">
        <h2 className="text-[15px] font-bold">Add New Material</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-[12px] font-medium text-muted-foreground mb-1.5">Material Name *</label>
            <input
              autoFocus
              className={inp}
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Steel Bar 12mm"
              onKeyDown={e => e.key === 'Enter' && submit()}
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-muted-foreground mb-1.5">Unit</label>
            <select
              className={inp}
              value={form.unitOfMeasure}
              onChange={e => setForm(p => ({ ...p, unitOfMeasure: e.target.value }))}
            >
              <option>Nos</option>
              <option>KG</option>
              <option>Ton</option>
              <option>LM</option>
              <option>M2</option>
              <option>M3</option>
              <option>Liter</option>
              <option>Box</option>
              <option>Bag</option>
              <option>Roll</option>
              <option>Set</option>
              <option>Pair</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-1">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={saving}>
            {saving ? 'Adding...' : 'Add Material'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ProcurementMaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const load = () => {
    setLoading(true);
    fetch('/api/procurement/materials')
      .then(r => r.json())
      .then(res => { setMaterials(res.data || []); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const filtered = search
    ? materials.filter(m => m.name.toLowerCase().includes(search.toLowerCase()) || m.sku.includes(search))
    : materials;

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return;
    const r = await fetch(`/api/procurement/materials/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName }),
    });
    if (r.ok) { toast.success('Updated'); load(); setEditId(null); }
    else toast.error('Failed to update');
  };

  const del = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    const r = await fetch(`/api/procurement/materials/${id}`, { method: 'DELETE' });
    if (r.ok) { toast.success('Deleted'); load(); }
    else toast.error('Cannot delete');
  };

  const inp = 'w-full h-8 px-2 text-[13px] border border-primary rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20';

  return (
    <div className="space-y-4">
      {showAdd && <AddMaterialModal onClose={() => setShowAdd(false)} onSaved={load} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Materials List</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">{materials.length} construction materials</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="size-3.5 mr-1" /> Add Material
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <input
          className="w-full h-9 pl-9 pr-3 text-[13px] border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          placeholder="Search materials..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[13px] text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="size-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-[13px] text-muted-foreground">No materials found</p>
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide w-24">SKU</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Material Name</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wide w-20">Unit</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wide w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(m => (
                <tr key={m.id} className="hover:bg-muted/10">
                  <td className="px-4 py-2.5 font-mono text-[12px] text-muted-foreground">{m.sku}</td>
                  <td className="px-4 py-2.5">
                    {editId === m.id ? (
                      <div className="flex gap-2 items-center">
                        <input
                          autoFocus
                          className={inp}
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveEdit(m.id); if (e.key === 'Escape') setEditId(null); }}
                        />
                        <button className="text-[12px] text-primary font-medium" onClick={() => saveEdit(m.id)}>Save</button>
                        <button className="text-[12px] text-muted-foreground" onClick={() => setEditId(null)}>Cancel</button>
                      </div>
                    ) : (
                      <span className="font-medium">{m.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center text-muted-foreground">{m.unitOfMeasure}</td>
                  <td className="px-4 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => { setEditId(m.id); setEditName(m.name); }}
                        className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        onClick={() => del(m.id, m.name)}
                        className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
