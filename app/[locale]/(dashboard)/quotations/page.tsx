'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  FileText, Plus, Search, Filter, Eye, Pencil, Trash2,
  Calendar, User, DollarSign, Download,
} from 'lucide-react';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { DeleteDialog } from '@/components/DeleteDialog';
import { useListPage } from '@/hooks/useListPage';
import { formatDate, fmtAmount } from '@/lib/utils';

interface Quotation {
  id: string;
  quotationNumber: string;
  status: string;
  total: number;
  createdAt: string;
  customer: { id: string; fullName: string } | null;
  client: { id: string; companyName: string } | null;
}

export default function QuotationsPage() {
  const t = useTranslations();
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();

  const { data: quotations, loading, search, setSearch, status, setStatus, page, setPage, meta, deleteTarget, setDeleteTarget, handleDelete } =
    useListPage<Quotation>({
      endpoint: '/api/quotations',
      deleteSuccessMsg: t('messages.deleteSuccess', { entity: t('quotations.title') }),
      deleteErrorMsg: t('common.error'),
      fetchErrorMsg: t('common.error'),
    });

  const getStatusLabel = (s: string) => ({
    DRAFT: t('quotations.statusDraft'),
    SENT: t('quotations.statusSent'),
    CLIENT_APPROVED: 'Client Approved',
    CLIENT_REJECTED: 'Client Rejected',
    APPROVED: t('quotations.statusApproved'),        // legacy
    CONFIRMED: t('quotations.statusConfirmed'),
    REJECTED: t('quotations.statusRejected'),         // legacy
    EXPIRED: t('quotations.statusExpired'),
    CONVERTED: t('quotations.statusConverted'),
  }[s] ?? s);

  return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <PageHeader
          title={t('quotations.title')}
          subtitle={`${meta.total} ${t('quotations.title')}`}
          icon={FileText}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => window.open('/api/export?type=quotations', '_blank')}>
                <Download className="size-3.5 me-1.5" />
                <span className="hidden sm:inline">CSV</span>
              </Button>
              <Link href={`/${locale}/quotations/new`}>
                <Button className="btn-premium" size="sm">
                  <Plus className="size-4 me-1 sm:me-2" />
                  <span className="hidden sm:inline">{t('quotations.create')}</span>
                  <span className="sm:hidden">{t('common.new')}</span>
                </Button>
              </Link>
            </div>
          }
        />

        <div className="p-5 space-y-5">
          {/* Filters */}
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
                  <SelectTrigger><SelectValue placeholder={t('quotations.allStatuses')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t('quotations.allStatuses')}</SelectItem>
                    <SelectItem value="DRAFT">{t('quotations.statusDraft')}</SelectItem>
                    <SelectItem value="SENT">{t('quotations.statusSent')}</SelectItem>
                    <SelectItem value="CLIENT_APPROVED">Client Approved</SelectItem>
                    <SelectItem value="CLIENT_REJECTED">Client Rejected</SelectItem>
                    <SelectItem value="CONFIRMED">{t('quotations.statusConfirmed')}</SelectItem>
                    <SelectItem value="EXPIRED">{t('quotations.statusExpired')}</SelectItem>
                    <SelectItem value="CONVERTED">{t('quotations.statusConverted')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Content */}
          {loading ? (
            <TableSkeleton rows={6} columns={7} />
          ) : quotations.length === 0 ? (
            <Card className="shadow-premium"><CardContent className="p-0"><EmptyState title={t('quotations.noQuotations')} /></CardContent></Card>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {quotations.map((q) => (
                  <Card key={q.id} className="shadow-premium">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <Link href={`/${locale}/quotations/${q.id}`} className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">{q.quotationNumber}</p>
                        </Link>
                        <StatusBadge status={q.status} label={getStatusLabel(q.status)} size="sm" />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-3">
                        <div className="flex items-center gap-1.5"><User className="size-3 shrink-0" /><span className="truncate">{q.client?.companyName || q.customer?.fullName || '-'}</span></div>
                        <div className="flex items-center gap-1.5"><DollarSign className="size-3 shrink-0" /><span>{fmtAmount(q.total, locale)}</span></div>
                        <div className="flex items-center gap-1.5"><Calendar className="size-3 shrink-0" /><span>{formatDate(q.createdAt, locale)}</span></div>
                      </div>
                      <div className="flex items-center justify-end gap-1 border-t pt-2">
                        <Link href={`/${locale}/quotations/${q.id}`}><Button variant="ghost" size="icon" className="size-11 text-muted-foreground hover:text-primary"><Eye className="size-4" /></Button></Link>
                        <Link href={`/${locale}/quotations/${q.id}/edit`}><Button variant="ghost" size="icon" className="size-11 text-muted-foreground hover:text-primary"><Pencil className="size-4" /></Button></Link>
                        <Button variant="ghost" size="icon" className="size-11 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(q.id)}><Trash2 className="size-4" /></Button>
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
                        {[t('quotations.quotationNumber'), t('clients.title'), t('quotations.total'), t('common.status'), t('common.date'), t('common.actions')].map((h, i) => (
                          <th key={i} className="px-4 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider first:px-7">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {quotations.map((q) => (
                        <tr key={q.id} className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => router.push(`/${locale}/quotations/${q.id}`)}>
                          <td className="px-7 py-4 text-start text-sm font-bold">{q.quotationNumber}</td>
                          <td className="px-4 py-4 text-start text-sm text-muted-foreground">{q.client?.companyName || q.customer?.fullName || '-'}</td>
                          <td className="px-4 py-4 text-center text-sm font-medium">{fmtAmount(q.total, locale)}</td>
                          <td className="px-4 py-4 text-center"><StatusBadge status={q.status} label={getStatusLabel(q.status)} /></td>
                          <td className="px-4 py-4 text-center text-sm text-muted-foreground">{formatDate(q.createdAt, locale)}</td>
                          <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <Link href={`/${locale}/quotations/${q.id}`}><Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-primary"><Eye className="size-3.5" /></Button></Link>
                              <Link href={`/${locale}/quotations/${q.id}/edit`}><Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-primary"><Pencil className="size-3.5" /></Button></Link>
                              <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(q.id)}><Trash2 className="size-3.5" /></Button>
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
