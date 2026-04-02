'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Building2, Plus, Search, Phone, Mail, MapPin, FileText,
  Pencil, Trash2, Loader2, ChevronRight, Users, UserPlus, X,
} from 'lucide-react';

interface Engineer { id: string; name: string; mobile: string | null; email: string | null; }
interface Client {
  id: string; companyName: string; trn: string | null;
  phone: string | null; email: string | null; address: string | null; notes: string | null;
  engineers: Engineer[];
  _count: { quotations: number; taxInvoices: number; };
}

const emptyClient = { companyName: '', trn: '', phone: '', email: '', address: '', notes: '' };
const emptyEngineer = { name: '', mobile: '', email: '' };

export default function ClientsPage() {
  const t = useTranslations();
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Client modal
  const [clientModal, setClientModal] = useState<{ open: boolean; mode: 'create' | 'edit'; data: typeof emptyClient; id?: string }>({
    open: false, mode: 'create', data: { ...emptyClient },
  });
  const [clientSaving, setClientSaving] = useState(false);

  // Engineer modal
  const [engModal, setEngModal] = useState<{ open: boolean; clientId: string; data: typeof emptyEngineer; id?: string }>({
    open: false, clientId: '', data: { ...emptyEngineer },
  });
  const [engSaving, setEngSaving] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'client' | 'engineer'; id: string; clientId?: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchClients = useCallback(() => {
    setLoading(true);
    const qs = search ? `?search=${encodeURIComponent(search)}&engineers=true` : '?engineers=true';
    fetch(`/api/clients${qs}`)
      .then(r => r.json())
      .then(({ data }) => setClients(data || []))
      .catch(() => toast.error(t('common.error')))
      .finally(() => setLoading(false));
  }, [search, t]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => fetchClients(), 400);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const openCreate = () => setClientModal({ open: true, mode: 'create', data: { ...emptyClient } });
  const openEdit = (c: Client) => setClientModal({ open: true, mode: 'edit', id: c.id, data: { companyName: c.companyName, trn: c.trn || '', phone: c.phone || '', email: c.email || '', address: c.address || '', notes: c.notes || '' } });

  const saveClient = async () => {
    if (!clientModal.data.companyName.trim()) { toast.error(t('clients.companyName') + ' is required'); return; }
    setClientSaving(true);
    try {
      const isEdit = clientModal.mode === 'edit';
      const res = await fetch(isEdit ? `/api/clients/${clientModal.id}` : '/api/clients', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientModal.data),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success(t('messages.createSuccess', { entity: t('clients.title') }));
      setClientModal(p => ({ ...p, open: false }));
      fetchClients();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('common.error'));
    } finally { setClientSaving(false); }
  };

  const openAddEngineer = (clientId: string) => setEngModal({ open: true, clientId, data: { ...emptyEngineer } });

  const saveEngineer = async () => {
    if (!engModal.data.name.trim()) { toast.error(t('clients.engineerName') + ' is required'); return; }
    setEngSaving(true);
    try {
      const res = await fetch(`/api/clients/${engModal.clientId}/engineers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(engModal.data),
      });
      if (!res.ok) throw new Error();
      toast.success(t('messages.createSuccess', { entity: t('clients.engineerName') }));
      setEngModal(p => ({ ...p, open: false }));
      fetchClients();
    } catch { toast.error(t('common.error')); }
    finally { setEngSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const url = deleteTarget.type === 'client'
        ? `/api/clients/${deleteTarget.id}`
        : `/api/clients/${deleteTarget.clientId}/engineers/${deleteTarget.id}`;
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success(t('messages.deleteSuccess', { entity: deleteTarget.name }));
      setDeleteTarget(null);
      fetchClients();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('common.error'));
    } finally { setDeleting(false); }
  };

  return (
    <div className="p-3 md:p-3.5 space-y-4">

      {/* Header */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{t('clients.title')}</h1>
              <p className="text-sm text-muted-foreground">{clients.length} {t('clients.title').toLowerCase()}</p>
            </div>
          </div>
          <Button onClick={openCreate} className="btn-premium">
            <Plus className="size-4 me-1.5" />{t('clients.create')}
          </Button>
        </div>

        {/* Search */}
        <div className="px-6 pb-5">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder={t('common.search') + '...'}
              className="ps-9 h-10"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Clients Grid */}
      {loading ? (
        <div className="bg-card rounded-2xl border border-border p-16 flex flex-col items-center shadow-sm">
          <Loader2 className="size-8 animate-spin text-primary mb-3" />
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        </div>
      ) : clients.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-16 flex flex-col items-center shadow-sm">
          <Building2 className="size-12 mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground mb-4">{t('clients.noClients')}</p>
          <Button onClick={openCreate} className="btn-premium">
            <Plus className="size-4 me-1.5" />{t('clients.create')}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clients.map(client => (
            <div key={client.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
              {/* Client Header */}
              <div className="px-5 pt-5 pb-4 border-b border-border/60">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="size-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-bold truncate">{client.companyName}</h2>
                      {client.trn && <p className="text-xs text-muted-foreground">TRN: {client.trn}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(client)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8 text-destructive/60 hover:text-destructive"
                      onClick={() => setDeleteTarget({ type: 'client', id: client.id, name: client.companyName })}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="mt-3 space-y-1">
                  {client.phone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Phone className="size-3 shrink-0" />{client.phone}
                    </p>
                  )}
                  {client.email && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                      <Mail className="size-3 shrink-0" />{client.email}
                    </p>
                  )}
                  {client.address && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <MapPin className="size-3 shrink-0" />{client.address}
                    </p>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 mt-3">
                  <span className="text-xs bg-muted/60 rounded-lg px-2.5 py-1 flex items-center gap-1.5">
                    <FileText className="size-3" />{client._count.quotations} {t('navigation.quotations')}
                  </span>
                  <span className="text-xs bg-muted/60 rounded-lg px-2.5 py-1 flex items-center gap-1.5">
                    <FileText className="size-3" />{client._count.taxInvoices} {t('navigation.taxInvoices')}
                  </span>
                </div>
              </div>

              {/* Engineers */}
              <div className="px-5 py-3 flex-1">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="size-3" />{t('clients.engineers')} ({client.engineers.length})
                  </p>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => openAddEngineer(client.id)}>
                    <UserPlus className="size-3 me-1" />{t('clients.addEngineer')}
                  </Button>
                </div>
                {client.engineers.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60 py-1">{t('clients.noEngineers')}</p>
                ) : (
                  <div className="space-y-1.5">
                    {client.engineers.map(eng => (
                      <div key={eng.id} className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{eng.name}</p>
                          {eng.mobile && <p className="text-xs text-muted-foreground">{eng.mobile}</p>}
                        </div>
                        <Button variant="ghost" size="icon" className="size-7 shrink-0 text-destructive/50 hover:text-destructive"
                          onClick={() => setDeleteTarget({ type: 'engineer', id: eng.id, clientId: client.id, name: eng.name })}>
                          <X className="size-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="px-5 py-3 border-t border-border/60 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 text-xs h-8"
                  onClick={() => router.push(`/${locale}/clients/${client.id}/statement`)}>
                  <FileText className="size-3 me-1" />{t('clients.statement')}
                  <ChevronRight className="size-3 ms-auto rtl:-scale-x-100" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Client Modal */}
      <Dialog open={clientModal.open} onOpenChange={o => setClientModal(p => ({ ...p, open: o }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="size-4 text-primary" />
              {clientModal.mode === 'create' ? t('clients.create') : t('clients.edit')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium block mb-1.5">{t('clients.companyName')} *</label>
              <Input value={clientModal.data.companyName}
                onChange={e => setClientModal(p => ({ ...p, data: { ...p.data, companyName: e.target.value } }))}
                placeholder="e.g. ABC Construction LLC" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">{t('clients.trn')}</label>
              <Input value={clientModal.data.trn}
                onChange={e => setClientModal(p => ({ ...p, data: { ...p.data, trn: e.target.value } }))}
                placeholder="100XXXXXXXXXX003" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium block mb-1.5">{t('clients.phone')}</label>
                <Input value={clientModal.data.phone}
                  onChange={e => setClientModal(p => ({ ...p, data: { ...p.data, phone: e.target.value } }))}
                  placeholder="+971..." />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">{t('clients.email')}</label>
                <Input value={clientModal.data.email}
                  onChange={e => setClientModal(p => ({ ...p, data: { ...p.data, email: e.target.value } }))}
                  placeholder="info@..." type="email" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">{t('clients.address')}</label>
              <Input value={clientModal.data.address}
                onChange={e => setClientModal(p => ({ ...p, data: { ...p.data, address: e.target.value } }))}
                placeholder="Dubai, UAE" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">{t('clients.notes')}</label>
              <Input value={clientModal.data.notes}
                onChange={e => setClientModal(p => ({ ...p, data: { ...p.data, notes: e.target.value } }))}
                placeholder="..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClientModal(p => ({ ...p, open: false }))}>{t('common.cancel')}</Button>
            <Button onClick={saveClient} disabled={clientSaving} className="btn-premium">
              {clientSaving ? <Loader2 className="size-4 me-1 animate-spin" /> : <Plus className="size-4 me-1" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Engineer Modal */}
      <Dialog open={engModal.open} onOpenChange={o => setEngModal(p => ({ ...p, open: o }))}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="size-4 text-primary" />{t('clients.addEngineer')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium block mb-1.5">{t('clients.engineerName')} *</label>
              <Input value={engModal.data.name}
                onChange={e => setEngModal(p => ({ ...p, data: { ...p.data, name: e.target.value } }))}
                placeholder="Eng. Ahmed Mohamed" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">{t('clients.engineerMobile')}</label>
              <Input value={engModal.data.mobile}
                onChange={e => setEngModal(p => ({ ...p, data: { ...p.data, mobile: e.target.value } }))}
                placeholder="+971..." />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">{t('clients.engineerEmail')}</label>
              <Input value={engModal.data.email}
                onChange={e => setEngModal(p => ({ ...p, data: { ...p.data, email: e.target.value } }))}
                placeholder="eng@..." type="email" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEngModal(p => ({ ...p, open: false }))}>{t('common.cancel')}</Button>
            <Button onClick={saveEngineer} disabled={engSaving} className="btn-premium">
              {engSaving ? <Loader2 className="size-4 me-1 animate-spin" /> : <Plus className="size-4 me-1" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="size-4" />{t('common.deleteConfirm')}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            {t('common.deleteConfirmDesc')} &ldquo;{deleteTarget?.name}&rdquo;
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>{t('common.cancel')}</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? <Loader2 className="size-4 me-1 animate-spin" /> : <Trash2 className="size-4 me-1" />}
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
