'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Receipt, Search, Filter, Eye, Trash2, User, Calendar, DollarSign, Download } from 'lucide-react';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { DeleteDialog } from '@/components/DeleteDialog';
import { useListPage } from '@/hooks/useListPage';
import { formatDate, fmtAmount } from '@/lib/utils';

interface TaxInvoice {
  id: string;
  invoiceNumber: string;
  projectName: string | null;
  status: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  createdAt: string;
  customer: { id: string; fullName: string } | null;
  client: { id: string; companyName: string } | null;
  quotation: { id: string; quotationNumber: string } | null;
}

function deriveInvoiceStatus(inv: TaxInvoice): string {
  const paid = inv.paidAmount || 0;
  if (inv.status === 'CANCELLED') return 'CANCELLED';
  if (inv.status === 'DRAFT') return 'DRAFT';
  if (paid <= 0) return inv.status === 'SENT' ? 'SENT' : 'UNPAID';
  if (paid >= inv.total - 0.01) return 'PAID';
  return 'PARTIAL';
}

export default function TaxInvoicesPage() {
  const t = useTranslations();
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();

  const { data: invoices, loading, search, setSearch, status, setStatus, page, setPage, meta, deleteTarget, setDeleteTarget, handleDelete } =
    useListPage<TaxInvoice>({
      endpoint: '/api/tax-invoices',
      deleteSuccessMsg: t('messages.deleteSuccess', { entity: t('taxInvoices.title') }),
      deleteErrorMsg: t('common.error'),
      fetchErrorMsg: t('common.error'),
    });

  const getStatusLabel = (s: string) => ({
    DRAFT: t('taxInvoices.statusDraft'),
    SENT: t('taxInvoices.statusSent'),
    UNPAID: t('taxInvoices.statusUnpaid'),
    PARTIAL: t('taxInvoices.statusPartial'),
    PAID: t('taxInvoices.statusPaid'),
    CANCELLED: t('taxInvoices.statusCancelled'),
  }[s] ?? s);

  return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <PageHeader
          title={t('taxInvoices.title')}
          subtitle={`${meta.total} ${t('taxInvoices.title')}`}
          icon={Receipt}
          actions={
            <Button variant="outline" size="sm" onClick={() => window.open('/api/export?type=tax-invoices', '_blank')}>
              <Download className="size-3.5 me-1.5" />
              <span className="hidden sm:inline">CSV</span>
            </Button>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative md:col-span-2">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input placeholder={t('common.search')} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-10" />
                </div>
                <Select value={status || 'ALL'} onValueChange={(v) => setStatus(v === 'ALL' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder={t('taxInvoices.allStatuses')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t('taxInvoices.allStatuses')}</SelectItem>
                    <SelectItem value="DRAFT">{t('taxInvoices.statusDraft')}</SelectItem>
                    <SelectItem value="SENT">{t('taxInvoices.statusSent')}</SelectItem>
                    <SelectItem value="UNPAID">{t('taxInvoices.statusUnpaid')}</SelectItem>
                    <SelectItem value="PARTIAL">{t('taxInvoices.statusPartial')}</SelectItem>
                    <SelectItem value="PAID">{t('taxInvoices.statusPaid')}</SelectItem>
                    <SelectItem value="CANCELLED">{t('taxInvoices.statusCancelled')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <TableSkeleton rows={6} columns={6} />
          ) : invoices.length === 0 ? (
            <Card className="shadow-premium">
              <CardContent className="p-0">
                <EmptyState title={t('taxInvoices.noInvoices')} description={t('taxInvoices.createFromQuotation')} />
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Mobile */}
              <div className="md:hidden space-y-3">
                {invoices.map((inv) => (
                  <Card key={inv.id} className="shadow-premium">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <Link href={`/${locale}/tax-invoices/${inv.id}`} className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">{inv.invoiceNumber}</p>
                          {inv.projectName && <p className="text-xs text-muted-foreground truncate">{inv.projectName}</p>}
                        </Link>
                        <StatusBadge status={deriveInvoiceStatus(inv)} label={getStatusLabel(deriveInvoiceStatus(inv))} size="sm" />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-3">
                        <div className="flex items-center gap-1.5"><User className="size-3" /><span className="truncate">{inv.client?.companyName || inv.customer?.fullName || '—'}</span></div>
                        <div className="flex items-center gap-1.5"><DollarSign className="size-3" /><span>{fmtAmount(inv.total, locale)} AED</span></div>
                        <div className="flex items-center gap-1.5"><Calendar className="size-3" /><span>{formatDate(inv.createdAt, locale)}</span></div>
                      </div>
                      <div className="flex items-center justify-end gap-1 border-t pt-2">
                        <Link href={`/${locale}/tax-invoices/${inv.id}`}><Button variant="ghost" size="icon" className="size-11"><Eye className="size-4" /></Button></Link>
                        <Button variant="ghost" size="icon" className="size-11 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(inv.id)}><Trash2 className="size-4" /></Button>
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
                        {[t('taxInvoices.invoiceNumber'), t('quotations.customer'), t('quotations.projectName'), t('quotations.total'), t('common.status'), t('common.date'), t('common.actions')].map((h, i) => (
                          <th key={i} className="px-4 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider first:px-6">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => router.push(`/${locale}/tax-invoices/${inv.id}`)}>
                          <td className="px-6 py-4 text-start text-sm font-bold text-primary">{inv.invoiceNumber}</td>
                          <td className="px-4 py-4 text-start text-sm text-muted-foreground">{inv.client?.companyName || inv.customer?.fullName || '—'}</td>
                          <td className="px-4 py-4 text-start text-sm text-muted-foreground">{inv.projectName ?? '—'}</td>
                          <td className="px-4 py-4 text-center text-sm font-medium">{fmtAmount(inv.total, locale)} AED</td>
                          <td className="px-4 py-4 text-center"><StatusBadge status={deriveInvoiceStatus(inv)} label={getStatusLabel(deriveInvoiceStatus(inv))} /></td>
                          <td className="px-4 py-4 text-center text-sm text-muted-foreground">{formatDate(inv.createdAt, locale)}</td>
                          <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <Link href={`/${locale}/tax-invoices/${inv.id}`}><Button variant="ghost" size="icon" className="size-8"><Eye className="size-3.5" /></Button></Link>
                              <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(inv.id)}><Trash2 className="size-3.5" /></Button>
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
