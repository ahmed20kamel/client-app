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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Receipt, Search, Filter, Eye, Trash2, ChevronLeft, ChevronRight, AlertCircle, User, Calendar, DollarSign } from 'lucide-react';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';

interface TaxInvoice {
  id: string;
  invoiceNumber: string;
  projectName: string | null;
  status: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  createdAt: string;
  customer: { id: string; fullName: string };
  quotation: { id: string; quotationNumber: string } | null;
}

export default function TaxInvoicesPage() {
  const t = useTranslations();
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();

  const [invoices, setInvoices] = useState<TaxInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const STATUS_LABELS: Record<string, string> = {
    DRAFT: t('taxInvoices.statusDraft'),
    SENT: t('taxInvoices.statusSent'),
    PAID: t('taxInvoices.statusPaid'),
    CANCELLED: t('taxInvoices.statusCancelled'),
  };

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const q = new URLSearchParams({ page: page.toString() });
      if (search) q.set('search', search);
      if (status) q.set('status', status);
      const res = await fetch(`/api/tax-invoices?${q}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setInvoices(data.data);
      setMeta(data.meta);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, [page, search, status]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/tax-invoices/${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success(t('messages.deleteSuccess', { entity: t('taxInvoices.title') })); setDeleteTarget(null); fetchInvoices(); }
    else toast.error(t('common.error'));
  };

  const fmt = (n: number) => n.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-AE');

  return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <PageHeader
          title={t('taxInvoices.title')}
          subtitle={`${meta.total} ${t('taxInvoices.title')}`}
          icon={Receipt}
        />

        <div className="p-5 space-y-5">
          {/* Filters */}
          <Card className="shadow-premium">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Filter className="size-4 text-primary" />{t('common.search')} & {t('common.filter')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative md:col-span-2">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input placeholder={t('common.search')} value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="ps-10" />
                </div>
                <Select value={status} onValueChange={(v) => { setStatus(v === 'ALL' ? '' : v); setPage(1); }}>
                  <SelectTrigger><SelectValue placeholder={t('taxInvoices.allStatuses')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t('taxInvoices.allStatuses')}</SelectItem>
                    <SelectItem value="DRAFT">{t('taxInvoices.statusDraft')}</SelectItem>
                    <SelectItem value="SENT">{t('taxInvoices.statusSent')}</SelectItem>
                    <SelectItem value="PAID">{t('taxInvoices.statusPaid')}</SelectItem>
                    <SelectItem value="CANCELLED">{t('taxInvoices.statusCancelled')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          {loading ? (
            <TableSkeleton rows={6} columns={6} />
          ) : invoices.length === 0 ? (
            <Card className="shadow-premium">
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <AlertCircle className="size-12 mb-4 text-muted-foreground/40" />
                <p className="text-lg font-medium">{t('taxInvoices.noInvoices')}</p>
                <p className="text-sm mt-1">{t('taxInvoices.createFromQuotation')}</p>
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
                        <StatusBadge status={inv.status} label={STATUS_LABELS[inv.status] || inv.status} size="sm" />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-3">
                        <div className="flex items-center gap-1.5"><User className="size-3" /><span className="truncate">{inv.customer.fullName}</span></div>
                        <div className="flex items-center gap-1.5"><DollarSign className="size-3" /><span>{fmt(inv.total)} AED</span></div>
                        <div className="flex items-center gap-1.5"><Calendar className="size-3" /><span>{fmtDate(inv.createdAt)}</span></div>
                      </div>
                      <div className="flex items-center justify-end gap-1 border-t pt-2">
                        <Link href={`/${locale}/tax-invoices/${inv.id}`}>
                          <Button variant="ghost" size="icon" className="size-11"><Eye className="size-4" /></Button>
                        </Link>
                        <Button variant="ghost" size="icon" className="size-11 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(inv.id)}>
                          <Trash2 className="size-4" />
                        </Button>
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
                        <th className="px-6 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">{t('taxInvoices.invoiceNumber')}</th>
                        <th className="px-4 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">{t('quotations.customer')}</th>
                        <th className="px-4 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">{t('quotations.projectName')}</th>
                        <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">{t('quotations.total')}</th>
                        <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">{t('common.status')}</th>
                        <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">{t('common.date')}</th>
                        <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">{t('common.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => router.push(`/${locale}/tax-invoices/${inv.id}`)}>
                          <td className="px-6 py-4 text-start text-sm font-bold text-primary">{inv.invoiceNumber}</td>
                          <td className="px-4 py-4 text-start text-sm text-muted-foreground">{inv.customer.fullName}</td>
                          <td className="px-4 py-4 text-start text-sm text-muted-foreground">{inv.projectName || '—'}</td>
                          <td className="px-4 py-4 text-center text-sm font-medium">{fmt(inv.total)} AED</td>
                          <td className="px-4 py-4 text-center">
                            <StatusBadge status={inv.status} label={STATUS_LABELS[inv.status] || inv.status} />
                          </td>
                          <td className="px-4 py-4 text-center text-sm text-muted-foreground">{fmtDate(inv.createdAt)}</td>
                          <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <Link href={`/${locale}/tax-invoices/${inv.id}`}>
                                <Button variant="ghost" size="icon" className="size-8"><Eye className="size-3.5" /></Button>
                              </Link>
                              <AlertDialog open={deleteTarget === inv.id} onOpenChange={(open) => setDeleteTarget(open ? inv.id : null)}>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive"><Trash2 className="size-3.5" /></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{t('common.deleteConfirm')}</AlertDialogTitle>
                                    <AlertDialogDescription>{t('common.deleteConfirmDesc')}</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(inv.id)} className="bg-destructive text-white hover:bg-destructive/90">{t('common.delete')}</AlertDialogAction>
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

              {/* Pagination */}
              {meta.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <p className="text-sm text-muted-foreground">
                    {t('common.showing')} {(meta.page - 1) * meta.limit + 1} - {Math.min(meta.page * meta.limit, meta.total)} {t('common.of')} {meta.total}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button onClick={() => setPage(p => p - 1)} disabled={page === 1} variant="outline" size="sm">
                      <ChevronLeft className="size-4 me-1 rtl:-scale-x-100" />{t('common.previous')}
                    </Button>
                    <span className="text-sm font-medium">{meta.page} / {meta.totalPages}</span>
                    <Button onClick={() => setPage(p => p + 1)} disabled={page === meta.totalPages} variant="outline" size="sm">
                      {t('common.next')}<ChevronRight className="size-4 ms-1 rtl:-scale-x-100" />
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
