'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useSelection } from '@/hooks/use-selection';
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
  Users, Plus, Search, Filter, Eye, Pencil, Trash2, RotateCcw,
  Building2, Phone, TrendingUp, DollarSign, Calendar, UserCheck, Package,
} from 'lucide-react';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { PageHeader } from '@/components/PageHeader';
import { DualLanguageName } from '@/components/DualLanguageName';
import { CopyablePhone } from '@/components/CopyablePhone';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { DeleteDialog } from '@/components/DeleteDialog';
import { useListPage } from '@/hooks/useListPage';
import { formatDate, fmtAmount } from '@/lib/utils';

interface Customer {
  id: string;
  fullName: string;
  fullNameAr: string | null;
  phone: string;
  company: string | null;
  customerType: string;
  status: string;
  emirate: string | null;
  leadSource: string | null;
  productType: string | null;
  estimatedValue: number | null;
  probability: number | null;
  weightedValue: number | null;
  nextFollowUp: string | null;
  deletedAt: string | null;
  createdAt: string;
  owner: { id: string; fullName: string };
  _count: { tasks: number };
}

const PRODUCT_TYPE_TRANSLATION_MAP: Record<string, string> = {
  LIGHT_STEEL: 'lightSteel',
  LIGHT_PAD: 'lightPad',
  ALUMINUM: 'aluminum',
};

const STATUS_TRANSLATION_MAP: Record<string, string> = {
  NEW_INQUIRY: 'statusNewInquiry',
  QUOTATION_SENT: 'statusQuotationSent',
  TECHNICAL_DISCUSSION: 'statusTechnicalDiscussion',
  NEGOTIATION: 'statusNegotiation',
  FINAL_OFFER: 'statusFinalOffer',
  VERBAL_APPROVAL: 'statusVerbalApproval',
  WON: 'statusWon',
  LOST: 'statusLost',
};

export default function CustomersPage() {
  const t = useTranslations();
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();

  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const {
    data: customers, loading, search, setSearch, setFilter, clearFilters,
    filters, page, setPage, meta, deleteTarget, setDeleteTarget, handleDelete, refresh,
  } = useListPage<Customer>({
    endpoint: '/api/customers',
    deleteSuccessMsg: t('messages.deleteSuccess', { entity: t('customers.title') }),
    deleteErrorMsg: t('common.error'),
    fetchErrorMsg: t('common.error'),
  });

  const { selectedIds, toggleOne, toggleAll, clearSelection, isAllSelected, isSomeSelected, selectedCount, isSelected } = useSelection(customers);

  const handleBulkDelete = async () => {
    try {
      await Promise.all(Array.from(selectedIds).map((id) => fetch(`/api/customers/${id}`, { method: 'DELETE' })));
      toast.success(t('messages.deleteSuccess', { entity: t('customers.title') }));
      clearSelection();
      setBulkDeleteOpen(false);
      refresh();
    } catch { toast.error(t('common.error')); }
  };

  const handleRestoreCustomer = async (id: string) => {
    try {
      const res = await fetch(`/api/customers/${id}/restore`, { method: 'POST' });
      if (!res.ok) throw new Error();
      toast.success(t('messages.restoreSuccess', { entity: t('customers.title') }));
      refresh();
    } catch { toast.error(t('common.error')); }
  };

  const hasActiveFilters = !!(filters.customerType || filters.status || filters.leadSource || filters.emirate || filters.productType || filters.showDeleted);

  return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <PageHeader
          title={t('customers.title')}
          subtitle={`${meta.total} ${t('customers.title')}`}
          icon={Users}
          actions={
            <Link href={`/${locale}/customers/new`}>
              <Button className="btn-premium" size="sm">
                <Plus className="size-4 me-1 sm:me-2" />
                <span className="hidden sm:inline">{t('customers.create')}</span>
                <span className="sm:hidden">{t('common.new')}</span>
              </Button>
            </Link>
          }
        />

        <div className="p-5 space-y-5">
          {/* Filters */}
          <Card className="shadow-premium">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Filter className="size-4 text-primary" />
                {t('common.search')} {t('common.and')} {t('common.filter')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <div className="relative xl:col-span-2">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input placeholder={t('common.search')} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-10" />
                </div>
                <Select value={filters.status || 'ALL'} onValueChange={(v) => setFilter('status', v === 'ALL' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder={t('common.status')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t('common.status')}</SelectItem>
                    <SelectItem value="NEW_INQUIRY">{t('customers.statusNewInquiry')}</SelectItem>
                    <SelectItem value="QUOTATION_SENT">{t('customers.statusQuotationSent')}</SelectItem>
                    <SelectItem value="TECHNICAL_DISCUSSION">{t('customers.statusTechnicalDiscussion')}</SelectItem>
                    <SelectItem value="NEGOTIATION">{t('customers.statusNegotiation')}</SelectItem>
                    <SelectItem value="FINAL_OFFER">{t('customers.statusFinalOffer')}</SelectItem>
                    <SelectItem value="VERBAL_APPROVAL">{t('customers.statusVerbalApproval')}</SelectItem>
                    <SelectItem value="WON">{t('customers.statusWon')}</SelectItem>
                    <SelectItem value="LOST">{t('customers.statusLost')}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filters.leadSource || 'ALL'} onValueChange={(v) => setFilter('leadSource', v === 'ALL' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder={t('customers.leadSource')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t('customers.leadSource')}</SelectItem>
                    <SelectItem value="INSTAGRAM">{t('customers.leadSources.instagram')}</SelectItem>
                    <SelectItem value="FACEBOOK">{t('customers.leadSources.facebook')}</SelectItem>
                    <SelectItem value="WEBSITE">{t('customers.leadSources.website')}</SelectItem>
                    <SelectItem value="CONSULTANT">{t('customers.leadSources.consultant')}</SelectItem>
                    <SelectItem value="REFERRAL">{t('customers.leadSources.referral')}</SelectItem>
                    <SelectItem value="EXHIBITION">{t('customers.leadSources.exhibition')}</SelectItem>
                    <SelectItem value="COLD_CALL">{t('customers.leadSources.coldCall')}</SelectItem>
                    <SelectItem value="OTHER">{t('customers.leadSources.other')}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filters.emirate || 'ALL'} onValueChange={(v) => setFilter('emirate', v === 'ALL' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder={t('customers.emirate')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t('customers.emirate')}</SelectItem>
                    <SelectItem value="ABU_DHABI">{t('customers.emirates.abuDhabi')}</SelectItem>
                    <SelectItem value="DUBAI">{t('customers.emirates.dubai')}</SelectItem>
                    <SelectItem value="SHARJAH">{t('customers.emirates.sharjah')}</SelectItem>
                    <SelectItem value="AJMAN">{t('customers.emirates.ajman')}</SelectItem>
                    <SelectItem value="UMM_AL_QUWAIN">{t('customers.emirates.ummAlQuwain')}</SelectItem>
                    <SelectItem value="RAS_AL_KHAIMAH">{t('customers.emirates.rasAlKhaimah')}</SelectItem>
                    <SelectItem value="FUJAIRAH">{t('customers.emirates.fujairah')}</SelectItem>
                    <SelectItem value="AL_AIN">{t('customers.emirates.alAin')}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filters.customerType || 'ALL'} onValueChange={(v) => setFilter('customerType', v === 'ALL' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder={t('customers.customerType')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t('customers.customerType')}</SelectItem>
                    <SelectItem value="NEW">{t('customers.typeNew')}</SelectItem>
                    <SelectItem value="EXISTING">{t('customers.typeExisting')}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filters.productType || 'ALL'} onValueChange={(v) => setFilter('productType', v === 'ALL' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder={t('customers.productType')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t('customers.productType')}</SelectItem>
                    <SelectItem value="LIGHT_STEEL">{t('customers.productTypes.lightSteel')}</SelectItem>
                    <SelectItem value="LIGHT_PAD">{t('customers.productTypes.lightPad')}</SelectItem>
                    <SelectItem value="ALUMINUM">{t('customers.productTypes.aluminum')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <input
                    type="checkbox"
                    checked={filters.showDeleted === 'true'}
                    onChange={(e) => setFilter('showDeleted', e.target.checked ? 'true' : '')}
                    className="size-4 rounded border-border"
                  />
                  {t('customers.showDeleted')}
                </label>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                    <RotateCcw className="size-3 me-1" />
                    {t('common.clear')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Bulk Actions */}
          {selectedCount > 0 && (
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between">
              <span className="text-sm font-medium text-primary">{t('common.selected', { count: selectedCount })}</span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={clearSelection}>{t('common.deselectAll')}</Button>
                <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm"><Trash2 className="size-3.5 me-1" />{t('common.deleteSelected')}</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('common.bulkDeleteConfirm', { count: selectedCount })}</AlertDialogTitle>
                      <AlertDialogDescription>{t('common.bulkDeleteConfirmDesc')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                      <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-white hover:bg-destructive/90">{t('common.delete')}</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}

          {loading ? (
            <TableSkeleton rows={6} columns={7} />
          ) : customers.length === 0 ? (
            <Card className="shadow-premium">
              <CardContent className="p-0">
                <EmptyState title={t('common.noData')} />
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {customers.map((customer) => (
                  <Card key={customer.id} className={`shadow-premium ${customer.deletedAt ? 'opacity-50' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <Link href={`/${locale}/customers/${customer.id}`} className="flex-1 min-w-0">
                          <DualLanguageName name={customer.fullName} nameAr={customer.fullNameAr} subtitle={customer.company} subtitleIcon={<Building2 className="size-3 shrink-0" />} />
                        </Link>
                        <StatusBadge status={customer.status} label={t(`customers.${STATUS_TRANSLATION_MAP[customer.status] || 'statusNewInquiry'}`)} size="sm" />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-3">
                        <div className="flex items-center gap-1.5"><Phone className="size-3 shrink-0" /><CopyablePhone phone={customer.phone} className="text-xs" /></div>
                        <div className="flex items-center gap-1.5"><UserCheck className="size-3 shrink-0" /><span className="truncate">{customer.owner.fullName}</span></div>
                        {customer.estimatedValue && <div className="flex items-center gap-1.5"><DollarSign className="size-3 shrink-0" /><span>{fmtAmount(customer.estimatedValue, locale)} {t('common.currency')}</span></div>}
                        {customer.nextFollowUp && <div className="flex items-center gap-1.5"><Calendar className="size-3 shrink-0" /><span>{formatDate(customer.nextFollowUp, locale)}</span></div>}
                      </div>
                      <div className="flex items-center justify-end gap-1 border-t pt-2">
                        {customer.deletedAt ? (
                          <Button variant="ghost" size="sm" onClick={() => handleRestoreCustomer(customer.id)} className="h-9 text-success">
                            <RotateCcw className="size-3.5 me-1" />{t('customers.restore')}
                          </Button>
                        ) : (
                          <>
                            <Link href={`/${locale}/customers/${customer.id}`}><Button variant="ghost" size="icon" className="size-11 text-muted-foreground hover:text-primary"><Eye className="size-4" /></Button></Link>
                            <Link href={`/${locale}/customers/${customer.id}/edit`}><Button variant="ghost" size="icon" className="size-11 text-muted-foreground hover:text-primary"><Pencil className="size-4" /></Button></Link>
                            <Button variant="ghost" size="icon" className="size-11 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(customer.id)}><Trash2 className="size-4" /></Button>
                          </>
                        )}
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
                        <th className="px-4 py-3 w-12">
                          <Checkbox checked={isAllSelected ? true : isSomeSelected ? 'indeterminate' : false} onCheckedChange={toggleAll} />
                        </th>
                        <th className="px-7 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">{t('customers.fullName')}</th>
                        <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider"><div className="flex items-center justify-center gap-1"><Phone className="size-3" />{t('common.phone')}</div></th>
                        <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">{t('common.status')}</th>
                        <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider"><div className="flex items-center justify-center gap-1"><DollarSign className="size-3" />{t('customers.estimatedValue')}</div></th>
                        <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider"><div className="flex items-center justify-center gap-1"><TrendingUp className="size-3" />{t('customers.weightedValue')}</div></th>
                        <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider"><div className="flex items-center justify-center gap-1"><Calendar className="size-3" />{t('customers.nextFollowUp')}</div></th>
                        <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider"><div className="flex items-center justify-center gap-1"><UserCheck className="size-3" />{t('customers.owner')}</div></th>
                        <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider"><div className="flex items-center justify-center gap-1"><Package className="size-3" />{t('customers.productType')}</div></th>
                        <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">{t('common.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {customers.map((customer) => (
                        <tr key={customer.id} className={`hover:bg-muted/20 transition-colors cursor-pointer ${customer.deletedAt ? 'opacity-50' : ''}`} onClick={() => router.push(`/${locale}/customers/${customer.id}`)}>
                          <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                            <Checkbox checked={isSelected(customer.id)} onCheckedChange={() => toggleOne(customer.id)} />
                          </td>
                          <td className="px-7 py-4 text-start">
                            <Link href={`/${locale}/customers/${customer.id}`} className="group text-sm font-bold">
                              <DualLanguageName name={customer.fullName} nameAr={customer.fullNameAr} subtitle={customer.company} subtitleIcon={<Building2 className="size-3" />} className="group-hover:text-primary transition-colors" />
                            </Link>
                            {customer.deletedAt && <Badge variant="destructive" className="mt-1 text-[10px]">{t('customers.deleted')}</Badge>}
                          </td>
                          <td className="px-4 py-4 text-center text-sm text-muted-foreground"><CopyablePhone phone={customer.phone} /></td>
                          <td className="px-4 py-4 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <StatusBadge status={customer.status} label={t(`customers.${STATUS_TRANSLATION_MAP[customer.status] || 'statusNewInquiry'}`)} />
                              <span className="text-[10px] text-muted-foreground font-mono">{customer.probability}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center text-sm text-muted-foreground">
                            {customer.estimatedValue ? `${fmtAmount(customer.estimatedValue, locale)} ${t('common.currency')}` : <span className="text-muted-foreground">-</span>}
                          </td>
                          <td className="px-4 py-4 text-center">
                            {customer.weightedValue ? <span className="text-sm font-semibold text-success">{fmtAmount(customer.weightedValue, locale)} {t('common.currency')}</span> : <span className="text-sm text-muted-foreground">-</span>}
                          </td>
                          <td className="px-4 py-4 text-center text-sm text-muted-foreground">
                            {customer.nextFollowUp ? <span className="inline-flex items-center gap-1"><Calendar className="size-3 text-muted-foreground" />{formatDate(customer.nextFollowUp, locale)}</span> : <span className="text-muted-foreground">-</span>}
                          </td>
                          <td className="px-4 py-4 text-center text-sm text-muted-foreground">{customer.owner.fullName}</td>
                          <td className="px-4 py-4 text-center text-sm text-muted-foreground">
                            {customer.productType ? (
                              <Badge variant="outline" className="text-xs">
                                {PRODUCT_TYPE_TRANSLATION_MAP[customer.productType] ? t(`customers.productTypes.${PRODUCT_TYPE_TRANSLATION_MAP[customer.productType]}`) : customer.productType}
                              </Badge>
                            ) : <span className="text-muted-foreground">-</span>}
                          </td>
                          <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                            {customer.deletedAt ? (
                              <Button variant="ghost" size="sm" onClick={() => handleRestoreCustomer(customer.id)} className="text-success hover:text-success/80 hover:bg-success/10">
                                <RotateCcw className="size-3.5 me-1" />{t('customers.restore')}
                              </Button>
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                <Link href={`/${locale}/customers/${customer.id}`}><Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-primary"><Eye className="size-3.5" /></Button></Link>
                                <Link href={`/${locale}/customers/${customer.id}/edit`}><Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-primary"><Pencil className="size-3.5" /></Button></Link>
                                <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(customer.id)}><Trash2 className="size-3.5" /></Button>
                              </div>
                            )}
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
