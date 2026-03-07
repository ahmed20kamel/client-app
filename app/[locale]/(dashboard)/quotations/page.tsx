'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  User,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';

interface Quotation {
  id: string;
  quotationNumber: string;
  subject: string | null;
  status: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  createdAt: string;
  validUntil: string | null;
  customer: {
    id: string;
    fullName: string;
  };
}

export default function QuotationsPage() {
  const t = useTranslations();
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const getStatusLabel = (s: string) => {
    const map: Record<string, string> = {
      DRAFT: t('quotations.statusDraft'),
      SENT: t('quotations.statusSent'),
      APPROVED: t('quotations.statusApproved'),
      REJECTED: t('quotations.statusRejected'),
      EXPIRED: t('quotations.statusExpired'),
      CONVERTED: t('quotations.statusConverted'),
    };
    return map[s] || s;
  };

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      queryParams.set('page', page.toString());
      if (search) queryParams.set('search', search);
      if (status) queryParams.set('status', status);

      const response = await fetch(`/api/quotations?${queryParams.toString()}`);

      if (!response.ok) {
        if (response.status === 403) {
          toast.error(t('messages.unauthorized'));
          return;
        }
        throw new Error('Failed to fetch quotations');
      }

      const data = await response.json();
      setQuotations(data.data);
      setMeta(data.meta);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, status]);

  const handleDeleteQuotation = async (id: string) => {
    try {
      const response = await fetch(`/api/quotations/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed');
      toast.success(t('messages.deleteSuccess', { entity: t('quotations.title') }));
      setDeleteTarget(null);
      fetchQuotations();
    } catch {
      toast.error(t('common.error'));
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString(locale === 'ar' ? 'ar-AE' : 'en-AE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(locale === 'ar' ? 'ar-AE' : 'en-AE');
  };

  return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
      {/* Header */}
      <PageHeader
        title={t('quotations.title')}
        subtitle={`${meta.total} ${t('quotations.title')}`}
        icon={FileText}
        actions={
          <Link href={`/${locale}/quotations/new`}>
            <Button className="btn-premium" size="sm">
              <Plus className="size-4 me-1 sm:me-2" />
              <span className="hidden sm:inline">{t('quotations.create')}</span>
              <span className="sm:hidden">{t('common.new')}</span>
            </Button>
          </Link>
        }
      />

      <div className="p-5 space-y-5">
      {/* Filters */}
      <Card className="shadow-premium mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="size-4 text-primary" />
            {t('common.search')} {locale === 'ar' ? 'و' : '&'} {t('common.filter')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative lg:col-span-2">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder={t('common.search')}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="ps-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={status} onValueChange={(val) => { setStatus(val === 'ALL' ? '' : val); setPage(1); }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('quotations.allStatuses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('quotations.allStatuses')}</SelectItem>
                <SelectItem value="DRAFT">{t('quotations.statusDraft')}</SelectItem>
                <SelectItem value="SENT">{t('quotations.statusSent')}</SelectItem>
                <SelectItem value="APPROVED">{t('quotations.statusApproved')}</SelectItem>
                <SelectItem value="REJECTED">{t('quotations.statusRejected')}</SelectItem>
                <SelectItem value="EXPIRED">{t('quotations.statusExpired')}</SelectItem>
                <SelectItem value="CONVERTED">{t('quotations.statusConverted')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={6} columns={7} />
      ) : quotations.length === 0 ? (
        <Card className="shadow-premium">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <AlertCircle className="size-12 mb-4 text-muted-foreground/40" />
            <p className="text-lg font-medium">{t('quotations.noQuotations')}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {quotations.map((quotation) => (
              <Card key={quotation.id} className="shadow-premium">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <Link href={`/${locale}/quotations/${quotation.id}`} className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{quotation.quotationNumber}</p>
                      {quotation.subject && (
                        <p className="text-xs text-muted-foreground truncate">{quotation.subject}</p>
                      )}
                    </Link>
                    <StatusBadge
                      status={quotation.status}
                      label={getStatusLabel(quotation.status)}
                      size="sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-3">
                    <div className="flex items-center gap-1.5">
                      <User className="size-3 shrink-0" />
                      <span className="truncate">{quotation.customer.fullName}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="size-3 shrink-0" />
                      <span className="truncate">{formatCurrency(quotation.total)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="size-3 shrink-0" />
                      <span className="truncate">{formatDate(quotation.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-1 border-t pt-2">
                    <Link href={`/${locale}/quotations/${quotation.id}`}>
                      <Button variant="ghost" size="icon" className="size-11 text-muted-foreground hover:text-primary">
                        <Eye className="size-4" />
                      </Button>
                    </Link>
                    <Link href={`/${locale}/quotations/${quotation.id}/edit`}>
                      <Button variant="ghost" size="icon" className="size-11 text-muted-foreground hover:text-primary">
                        <Pencil className="size-4" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon" className="size-11 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(quotation.id)}>
                      <Trash2 className="size-4" />
                    </Button>
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
                    <th className="px-7 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      {t('quotations.quotationNumber')}
                    </th>
                    <th className="px-4 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      {t('quotations.customer')}
                    </th>
                    <th className="px-4 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      {t('quotations.subject')}
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      <div className="flex items-center justify-center gap-1">
                        <DollarSign className="size-3" />
                        {t('quotations.total')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      {t('common.status')}
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      <div className="flex items-center justify-center gap-1">
                        <Calendar className="size-3" />
                        {t('common.date')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      {t('common.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {quotations.map((quotation) => (
                    <tr key={quotation.id} className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => router.push(`/${locale}/quotations/${quotation.id}`)}>
                      <td className="px-7 py-4 text-start">
                        <p className="text-sm font-bold">{quotation.quotationNumber}</p>
                      </td>
                      <td className="px-4 py-4 text-start text-sm text-muted-foreground">
                        {quotation.customer.fullName}
                      </td>
                      <td className="px-4 py-4 text-start text-sm text-muted-foreground">
                        {quotation.subject || <span className="text-muted-foreground">-</span>}
                      </td>
                      <td className="px-4 py-4 text-center text-sm font-medium">
                        {formatCurrency(quotation.total)}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <StatusBadge
                          status={quotation.status}
                          label={getStatusLabel(quotation.status)}
                        />
                      </td>
                      <td className="px-4 py-4 text-center text-sm text-muted-foreground">
                        {formatDate(quotation.createdAt)}
                      </td>
                      <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <Link href={`/${locale}/quotations/${quotation.id}`}>
                            <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-primary">
                              <Eye className="size-3.5" />
                            </Button>
                          </Link>
                          <Link href={`/${locale}/quotations/${quotation.id}/edit`}>
                            <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-primary">
                              <Pencil className="size-3.5" />
                            </Button>
                          </Link>
                          <AlertDialog open={deleteTarget === quotation.id} onOpenChange={(open) => setDeleteTarget(open ? quotation.id : null)}>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive">
                                <Trash2 className="size-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('common.deleteConfirm')}</AlertDialogTitle>
                                <AlertDialogDescription>{t('common.deleteConfirmDesc')}</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteQuotation(quotation.id)} className="bg-destructive text-white hover:bg-destructive/90">
                                  {t('common.delete')}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Delete Dialog for mobile */}
          <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('common.deleteConfirm')}</AlertDialogTitle>
                <AlertDialogDescription>{t('common.deleteConfirmDesc')}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteTarget && handleDeleteQuotation(deleteTarget)} className="bg-destructive text-white hover:bg-destructive/90">
                  {t('common.delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t('common.showing')} {(meta.page - 1) * meta.limit + 1} - {Math.min(meta.page * meta.limit, meta.total)} {t('common.of')} {meta.total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  variant="outline"
                  size="sm"
                >
                  <ChevronLeft className="size-4 me-1 rtl:-scale-x-100" />
                  {t('common.previous')}
                </Button>
                <div className="flex items-center gap-1 px-2">
                  <span className="text-sm font-medium">{meta.page}</span>
                  <span className="text-sm text-muted-foreground">/</span>
                  <span className="text-sm text-muted-foreground">{meta.totalPages}</span>
                </div>
                <Button
                  onClick={() => setPage(page + 1)}
                  disabled={page === meta.totalPages}
                  variant="outline"
                  size="sm"
                >
                  {t('common.next')}
                  <ChevronRight className="size-4 ms-1 rtl:-scale-x-100" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
      </div>
      </div>
    </div>
  );
}
