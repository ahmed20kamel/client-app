'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShoppingCart, Plus, Search, Filter, Eye, Trash2, Truck, Calendar } from 'lucide-react';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { DeleteDialog } from '@/components/DeleteDialog';
import { useListPage } from '@/hooks/useListPage';
import { formatDate, fmtAmount } from '@/lib/utils';

interface PurchaseOrder {
  id: string;
  poNumber: string;
  total: number;
  status: string;
  expectedDate: string | null;
  supplier: { id: string; name: string };
}

export default function PurchaseOrdersPage() {
  const t = useTranslations();
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();

  const { data: purchaseOrders, loading, search, setSearch, status, setStatus, page, setPage, meta, deleteTarget, setDeleteTarget, handleDelete } =
    useListPage<PurchaseOrder>({
      endpoint: '/api/purchase-orders',
      deleteSuccessMsg: t('messages.deleteSuccess', { entity: t('purchaseOrders.title') }),
      deleteErrorMsg: t('common.error'),
      fetchErrorMsg: t('common.error'),
    });

  const getStatusLabel = (s: string) => ({
    DRAFT: t('purchaseOrders.statusDraft'),
    SENT: t('purchaseOrders.statusSent'),
    CONFIRMED: t('purchaseOrders.statusConfirmed'),
    PARTIALLY_RECEIVED: t('purchaseOrders.statusPartiallyReceived'),
    RECEIVED: t('purchaseOrders.statusReceived'),
    CANCELLED: t('purchaseOrders.statusCancelled'),
  }[s] ?? s);

  return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <PageHeader
          title={t('purchaseOrders.title')}
          subtitle={`${meta.total} ${t('purchaseOrders.title')}`}
          icon={ShoppingCart}
          actions={
            <Link href={`/${locale}/purchase-orders/new`}>
              <Button className="btn-premium" size="sm">
                <Plus className="size-4 me-1 sm:me-2" />
                <span className="hidden sm:inline">{t('purchaseOrders.create')}</span>
                <span className="sm:hidden">{t('common.new')}</span>
              </Button>
            </Link>
          }
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="relative lg:col-span-2">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input placeholder={t('common.search')} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-10" />
                </div>
                <Select value={status || 'ALL'} onValueChange={(v) => setStatus(v === 'ALL' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder={t('purchaseOrders.allStatuses')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t('purchaseOrders.allStatuses')}</SelectItem>
                    <SelectItem value="DRAFT">{t('purchaseOrders.statusDraft')}</SelectItem>
                    <SelectItem value="SENT">{t('purchaseOrders.statusSent')}</SelectItem>
                    <SelectItem value="CONFIRMED">{t('purchaseOrders.statusConfirmed')}</SelectItem>
                    <SelectItem value="PARTIALLY_RECEIVED">{t('purchaseOrders.statusPartiallyReceived')}</SelectItem>
                    <SelectItem value="RECEIVED">{t('purchaseOrders.statusReceived')}</SelectItem>
                    <SelectItem value="CANCELLED">{t('purchaseOrders.statusCancelled')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <TableSkeleton rows={6} columns={6} />
          ) : purchaseOrders.length === 0 ? (
            <Card className="shadow-premium"><CardContent className="p-0"><EmptyState title={t('purchaseOrders.noPurchaseOrders')} /></CardContent></Card>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {purchaseOrders.map((po) => (
                  <Card key={po.id} className="shadow-premium">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <Link href={`/${locale}/purchase-orders/${po.id}`} className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">{po.poNumber}</p>
                        </Link>
                        <StatusBadge status={po.status} label={getStatusLabel(po.status)} size="sm" />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-3">
                        <div className="flex items-center gap-1.5"><Truck className="size-3 shrink-0" /><span className="truncate">{po.supplier.name}</span></div>
                        <div className="flex items-center gap-1.5"><ShoppingCart className="size-3 shrink-0" /><span>{fmtAmount(po.total, locale)}</span></div>
                        <div className="flex items-center gap-1.5"><Calendar className="size-3 shrink-0" /><span>{formatDate(po.expectedDate, locale)}</span></div>
                      </div>
                      <div className="flex items-center justify-end gap-1 border-t pt-2">
                        <Link href={`/${locale}/purchase-orders/${po.id}`}><Button variant="ghost" size="icon" className="size-11 text-muted-foreground hover:text-primary"><Eye className="size-4" /></Button></Link>
                        <Button variant="ghost" size="icon" className="size-11 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(po.id)}><Trash2 className="size-4" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop Table */}
              <Card className="shadow-premium overflow-hidden hidden md:block">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        {[t('purchaseOrders.poNumber'), t('purchaseOrders.supplier'), t('purchaseOrders.total'), t('common.status'), t('purchaseOrders.expectedDate'), t('common.actions')].map((h, i) => (
                          <th key={i} className="px-4 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider first:px-7">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {purchaseOrders.map((po) => (
                        <tr key={po.id} className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => router.push(`/${locale}/purchase-orders/${po.id}`)}>
                          <td className="px-7 py-4 text-start text-sm font-bold">{po.poNumber}</td>
                          <td className="px-4 py-4 text-start text-sm text-muted-foreground">{po.supplier.name}</td>
                          <td className="px-4 py-4 text-center text-sm font-semibold">{fmtAmount(po.total, locale)}</td>
                          <td className="px-4 py-4 text-center"><StatusBadge status={po.status} label={getStatusLabel(po.status)} /></td>
                          <td className="px-4 py-4 text-center text-sm text-muted-foreground">{formatDate(po.expectedDate, locale)}</td>
                          <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <Link href={`/${locale}/purchase-orders/${po.id}`}><Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-primary"><Eye className="size-3.5" /></Button></Link>
                              <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(po.id)}><Trash2 className="size-3.5" /></Button>
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
