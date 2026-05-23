'use client';
import { useState, useEffect } from 'react';
import { Paperclip, Plus, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface Attachment {
  id: string;
  title: string;
  url: string | null;
  notes: string | null;
  createdAt: string;
}

interface Props {
  entityType: 'PR' | 'PO' | 'GRN' | 'INVOICE';
  entityId: string;
}

export function AttachmentPanel({ entityType, entityId }: Props) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', url: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetch(`/api/procurement/attachments?entityType=${entityType}&entityId=${entityId}`)
      .then(r => r.json())
      .then(res => setAttachments(res.data || []));
  };

  useEffect(() => { load(); }, [entityType, entityId]);

  const add = async () => {
    if (!form.title.trim()) return toast.error('Title is required');
    setSaving(true);
    const res = await fetch('/api/procurement/attachments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityType, entityId, ...form }),
    });
    if (res.ok) {
      toast.success('Attachment added');
      setForm({ title: '', url: '', notes: '' });
      setShowForm(false);
      load();
    } else {
      toast.error('Failed to add');
    }
    setSaving(false);
  };

  const del = async (id: string) => {
    if (!confirm('Remove this attachment?')) return;
    const res = await fetch(`/api/procurement/attachments/${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Removed'); load(); }
    else toast.error('Failed to remove');
  };

  const inp = 'w-full h-8 px-2.5 text-[13px] border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20';

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip className="size-4 text-muted-foreground" />
          <h2 className="text-[13px] font-semibold">Attachments</h2>
          {attachments.length > 0 && (
            <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{attachments.length}</span>
          )}
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1 text-[12px] text-primary hover:text-primary/80 font-medium"
        >
          <Plus className="size-3.5" /> Add
        </button>
      </div>

      {showForm && (
        <div className="px-5 py-4 border-b border-border bg-muted/20 space-y-2">
          <input
            autoFocus
            className={inp}
            placeholder="Title *  (e.g. Supplier Invoice PDF)"
            value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
          />
          <input
            className={inp}
            placeholder="URL (Google Drive, SharePoint, etc.)"
            value={form.url}
            onChange={e => setForm(p => ({ ...p, url: e.target.value }))}
          />
          <input
            className={inp}
            placeholder="Notes (optional)"
            value={form.notes}
            onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
          />
          <div className="flex gap-2 justify-end pt-1">
            <button onClick={() => setShowForm(false)} className="text-[12px] text-muted-foreground px-3 py-1.5 rounded-lg hover:bg-muted">Cancel</button>
            <button
              onClick={add}
              disabled={saving}
              className="text-[12px] text-white bg-primary px-3 py-1.5 rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {attachments.length === 0 && !showForm ? (
        <div className="px-5 py-4 text-[12px] text-muted-foreground">No attachments yet</div>
      ) : (
        <div className="divide-y divide-border">
          {attachments.map(att => (
            <div key={att.id} className="px-5 py-3 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[13px] font-medium truncate">{att.title}</p>
                  {att.url && (
                    <a href={att.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-primary hover:text-primary/80">
                      <ExternalLink className="size-3.5" />
                    </a>
                  )}
                </div>
                {att.notes && <p className="text-[11px] text-muted-foreground mt-0.5">{att.notes}</p>}
                <p className="text-[11px] text-muted-foreground/60 mt-0.5">{new Date(att.createdAt).toLocaleDateString('en-AE')}</p>
              </div>
              <button
                onClick={() => del(att.id)}
                className="shrink-0 p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
