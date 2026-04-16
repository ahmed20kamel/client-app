'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package2, Search, Filter, Eye, Trash2, User, Calendar } from 'lucide-react';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { DeleteDialog } from '@/components/DeleteDialog';
import { useListPage } from '@/hooks/useListPage';
import { formatDate } from '@/lib/utils';

interface DeliveryNote {
  id: string;
  dnNumber: string;
  projectName: string | null;
  status: string;
  receiverName: string | null;
  createdAt: string;
  customer: { id: string; fullName: string } | null;
  client: { id: string; companyName: string } | null;
  taxInvoice: { id: string; invoiceNumber: string } | null;
}

export default function DeliveryNotesPage() {
  const t = useTranslations();
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();

  const { data: notes, loading, search, setSearch, status, setStatus, page, setPage, meta, deleteTarget, setDeleteTarget, handleDelete } =
    useListPage<DeliveryNote>({
      endpoint: '/api/delivery-notes',
      deleteSuccessMsg: t('messages.deleteSuccess', { entity: t('deliveryNotes.title') }),
      deleteErrorMsg: t('common.error'),
      fetchErrorMsg: t('common.error'),
    });

  const getStatusLabel = (s: string) => ({
    DRAFT: t('deliveryNotes.statusDraft'),
    DELIVERED: t('deliveryNotes.statusDelivered'),
    RETURNED: t('deliveryNotes.statusReturned'),
  }[s] ?? s);

  return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <PageHeader
          title={t('deliveryNotes.title')}
          subtitle={`${meta.total} ${t('deliveryNotes.title')}`}
          icon={Package2}
        />

        <div className="p-5 space-y-5">
          <Card className="shadow-premium">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Filter className="size-4 text-primary" />
                {t('common.search')} &amp; {t('common.filter')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative md:col-span-2">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input placeholder={t('common.search')} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-10" />
                </div>
                <Select value={status || 'ALL'} onValueChange={(v) => setStatus(v === 'ALL' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder={t('deliveryNotes.allStatuses')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t('deliveryNotes.allStatuses')}</SelectItem>
                    <SelectItem value="DRAFT">{t('deliveryNotes.statusDraft')}</SelectItem>
                    <SelectItem value="DELIVERED">{t('deliveryNotes.statusDelivered')}</SelectItem>
                    <SelectItem value="RETURNED">{t('deliveryNotes.statusReturned')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <TableSkeleton rows={6} columns={5} />
          ) : notes.length === 0 ? (
            <Card className="shadow-premium">
              <CardContent className="p-0">
                <EmptyState title={t('deliveryNotes.noNotes')} description={t('deliveryNotes.createFromInvoice')} />
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Mobile */}
              <div className="md:hidden space-y-3">
                {notes.map((dn) => (
                  <Card key={dn.id} className="shadow-premium">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <Link href={`/${locale}/delivery-notes/${dn.id}`} className="flex-1 min-w-0">
                          <p className="text-sm font-bold">{dn.dnNumber}</p>
                          {dn.projectName && <p className="text-xs text-muted-foreground truncate">{dn.projectName}</p>}
                        </Link>
                        <StatusBadge status={dn.status} label={getStatusLabel(dn.status)} size="sm" />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-3">
                        <div className="flex items-center gap-1.5"><User className="size-3" />{dn.client?.companyName || dn.customer?.fullName || '—'}</div>
                        <div className="flex items-center gap-1.5"><Calendar className="size-3" />{formatDate(dn.createdAt, locale)}</div>
                      </div>
                      <div className="flex items-center justify-end gap-1 border-t pt-2">
                        <Link href={`/${locale}/delivery-notes/${dn.id}`}><Button variant="ghost" size="icon" className="size-11"><Eye className="size-4" /></Button></Link>
                        <Button variant="ghost" size="icon" className="size-11 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(dn.id)}><Trash2 className="size-4" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop */}
              <Card className="shadow-premium overflow-hidden hidden md:block">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        {[t('deliveryNotes.dnNumber'), t('quotations.customer'), t('quotations.projectName'), t('deliveryNotes.receiver'), t('common.status'), t('common.date'), t('common.actions')].map((h, i) => (
                          <th key={i} className="px-4 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider first:px-6">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {notes.map((dn) => (
                        <tr key={dn.id} className="hover:bg-muted/20 cursor-pointer" onClick={() => router.push(`/${locale}/delivery-notes/${dn.id}`)}>
                          <td className="px-6 py-4 text-sm font-bold text-primary">{dn.dnNumber}</td>
                          <td className="px-4 py-4 text-sm text-muted-foreground">{dn.client?.companyName || dn.customer?.fullName || '—'}</td>
                          <td className="px-4 py-4 text-sm text-muted-foreground">{dn.projectName ?? '—'}</td>
                          <td className="px-4 py-4 text-center text-sm text-muted-foreground">{dn.receiverName ?? '—'}</td>
                          <td className="px-4 py-4 text-center"><StatusBadge status={dn.status} label={getStatusLabel(dn.status)} /></td>
                          <td className="px-4 py-4 text-center text-sm text-muted-foreground">{formatDate(dn.createdAt, locale)}</td>
                          <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <Link href={`/${locale}/delivery-notes/${dn.id}`}><Button variant="ghost" size="icon" className="size-8"><Eye className="size-3.5" /></Button></Link>
                              <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(dn.id)}><Trash2 className="size-3.5" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Pagination page={page} totalPages={meta.totalPages} total={meta.total} limit={meta.limit} onPageChange={setPage} />
            </>
          )}
        </div>
      </div>

      <DeleteDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)} onConfirm={() => deleteTarget && handleDelete(deleteTarget)} />
    </div>
  );
}
