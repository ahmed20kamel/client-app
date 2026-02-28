'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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
  Users,
  Plus,
  Search,
  Filter,
  Eye,
  Pencil,
  Trash2,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Building2,
  Phone,
  TrendingUp,
  DollarSign,
  Calendar,
  UserCheck,
  AlertCircle,
} from 'lucide-react';

interface Customer {
  id: string;
  fullName: string;
  phone: string;
  company: string | null;
  customerType: string;
  status: string;
  emirate: string | null;
  leadSource: string | null;
  estimatedValue: number | null;
  probability: number | null;
  weightedValue: number | null;
  nextFollowUp: string | null;
  deletedAt: string | null;
  createdAt: string;
  owner: {
    id: string;
    fullName: string;
  };
  _count: {
    tasks: number;
  };
}

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  NEW_INQUIRY: { color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  QUOTATION_SENT: { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  TECHNICAL_DISCUSSION: { color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  NEGOTIATION: { color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  FINAL_OFFER: { color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
  VERBAL_APPROVAL: { color: 'text-teal-700', bg: 'bg-teal-50 border-teal-200' },
  WON: { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  LOST: { color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
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

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [customerType, setCustomerType] = useState('');
  const [status, setStatus] = useState('');
  const [leadSource, setLeadSource] = useState('');
  const [emirate, setEmirate] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const { selectedIds, toggleOne, toggleAll, clearSelection, isAllSelected, isSomeSelected, selectedCount, isSelected } = useSelection(customers);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', page.toString());
      if (search) params.set('search', search);
      if (customerType) params.set('customerType', customerType);
      if (status) params.set('status', status);
      if (leadSource) params.set('leadSource', leadSource);
      if (emirate) params.set('emirate', emirate);
      if (showDeleted) params.set('showDeleted', 'true');

      const response = await fetch(`/api/customers?${params.toString()}`);

      if (!response.ok) {
        if (response.status === 403) {
          toast.error(t('messages.unauthorized'));
          return;
        }
        throw new Error('Failed to fetch customers');
      }

      const data = await response.json();
      setCustomers(data.data);
      setMeta(data.meta);
      clearSelection();
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, search, customerType, status, leadSource, emirate, showDeleted]);

  const handleDeleteCustomer = async (id: string) => {
    try {
      const response = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed');
      toast.success(t('messages.deleteSuccess', { entity: t('customers.title') }));
      setDeleteTarget(null);
      fetchCustomers();
    } catch { toast.error(t('common.error')); }
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/customers/${id}`, { method: 'DELETE' })
        )
      );
      toast.success(t('messages.deleteSuccess', { entity: t('customers.title') }));
      clearSelection();
      setBulkDeleteOpen(false);
      fetchCustomers();
    } catch { toast.error(t('common.error')); }
  };

  const handleRestoreCustomer = async (id: string) => {
    try {
      const response = await fetch(`/api/customers/${id}/restore`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to restore customer');
      }

      toast.success(t('messages.restoreSuccess', { entity: t('customers.title') }));
      fetchCustomers();
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  const clearFilters = () => {
    setSearch('');
    setCustomerType('');
    setStatus('');
    setLeadSource('');
    setEmirate('');
    setShowDeleted(false);
    setPage(1);
  };

  const hasActiveFilters = customerType || status || leadSource || emirate || showDeleted;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 lg:mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{t('customers.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {meta.total} {t('customers.title')}
          </p>
        </div>
        <Link href={`/${locale}/customers/new`}>
          <Button className="btn-premium" size="sm">
            <Plus className="size-4 me-1 sm:me-2" />
            <span className="hidden sm:inline">{t('customers.create')}</span>
            <span className="sm:hidden">{t('common.new')}</span>
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="shadow-premium mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="size-4 text-primary" />
            {t('common.search')} & {t('common.filter')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* Search */}
            <div className="relative xl:col-span-2">
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
                <SelectValue placeholder={t('common.status')} />
              </SelectTrigger>
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

            {/* Lead Source Filter */}
            <Select value={leadSource} onValueChange={(val) => { setLeadSource(val === 'ALL' ? '' : val); setPage(1); }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('customers.leadSource')} />
              </SelectTrigger>
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

            {/* Emirate Filter */}
            <Select value={emirate} onValueChange={(val) => { setEmirate(val === 'ALL' ? '' : val); setPage(1); }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('customers.emirate')} />
              </SelectTrigger>
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

            {/* Customer Type Filter */}
            <Select value={customerType} onValueChange={(val) => { setCustomerType(val === 'ALL' ? '' : val); setPage(1); }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('customers.customerType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('customers.customerType')}</SelectItem>
                <SelectItem value="TYPE_A">{t('customers.typeA')}</SelectItem>
                <SelectItem value="TYPE_B">{t('customers.typeB')}</SelectItem>
                <SelectItem value="TYPE_C">{t('customers.typeC')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Show Deleted & Clear */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
              <input
                type="checkbox"
                checked={showDeleted}
                onChange={(e) => {
                  setShowDeleted(e.target.checked);
                  setPage(1);
                }}
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
        <div className="mb-4 p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between animate-slide-down">
          <span className="text-sm font-medium text-primary">
            {t('common.selected', { count: selectedCount })}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              {t('common.deselectAll')}
            </Button>
            <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="size-3.5 me-1" />
                  {t('common.deleteSelected')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('common.bulkDeleteConfirm', { count: selectedCount })}</AlertDialogTitle>
                  <AlertDialogDescription>{t('common.bulkDeleteConfirmDesc')}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-white hover:bg-destructive/90">
                    {t('common.delete')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <Card className="shadow-premium">
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="size-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      ) : customers.length === 0 ? (
        <Card className="shadow-premium">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <AlertCircle className="size-12 mb-4 text-muted-foreground/40" />
            <p className="text-lg font-medium">{t('common.noData')}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="shadow-premium overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-3 w-12">
                      <Checkbox
                        checked={isAllSelected ? true : isSomeSelected ? 'indeterminate' : false}
                        onCheckedChange={toggleAll}
                      />
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('customers.fullName')}
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <div className="flex items-center gap-1">
                        <Phone className="size-3" />
                        {t('common.phone')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('common.status')}
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <div className="flex items-center gap-1">
                        <DollarSign className="size-3" />
                        {t('customers.estimatedValue')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="size-3" />
                        {t('customers.weightedValue')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <div className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        {t('customers.nextFollowUp')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <div className="flex items-center gap-1">
                        <UserCheck className="size-3" />
                        {t('customers.owner')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-end text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('common.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {customers.map((customer) => {
                    const statusConf = STATUS_CONFIG[customer.status] || STATUS_CONFIG.NEW_INQUIRY;
                    return (
                      <tr key={customer.id} className={`hover:bg-muted/20 transition-colors ${customer.deletedAt ? 'opacity-50' : ''}`}>
                        <td className="px-4 py-3.5">
                          <Checkbox
                            checked={isSelected(customer.id)}
                            onCheckedChange={() => toggleOne(customer.id)}
                          />
                        </td>
                        <td className="px-4 py-3.5">
                          <Link
                            href={`/${locale}/customers/${customer.id}`}
                            className="group"
                          >
                            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                              {customer.fullName}
                            </p>
                            {customer.company && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Building2 className="size-3" />
                                {customer.company}
                              </p>
                            )}
                          </Link>
                          {customer.deletedAt && (
                            <Badge variant="destructive" className="mt-1 text-[10px]">
                              {t('customers.deleted')}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-foreground">
                          {customer.phone}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusConf.bg} ${statusConf.color}`}>
                              {t(`customers.${STATUS_TRANSLATION_MAP[customer.status] || 'statusNewInquiry'}`)}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {customer.probability}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-foreground font-medium">
                          {customer.estimatedValue ? `${customer.estimatedValue.toLocaleString(locale === 'ar' ? 'ar-AE' : 'en-AE')} ${t('common.currency')}` : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          {customer.weightedValue ? (
                            <span className="text-sm font-semibold text-emerald-600">
                              {customer.weightedValue.toLocaleString(locale === 'ar' ? 'ar-AE' : 'en-AE')} {t('common.currency')}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-foreground">
                          {customer.nextFollowUp ? (
                            <span className="flex items-center gap-1">
                              <Calendar className="size-3 text-muted-foreground" />
                              {new Date(customer.nextFollowUp).toLocaleDateString(locale === 'ar' ? 'ar-AE' : 'en-AE')}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-foreground">
                          {customer.owner.fullName}
                        </td>
                        <td className="px-4 py-3.5 text-end">
                          {customer.deletedAt ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRestoreCustomer(customer.id)}
                              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            >
                              <RotateCcw className="size-3.5 me-1" />
                              {t('customers.restore')}
                            </Button>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <Link href={`/${locale}/customers/${customer.id}`}>
                                <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-primary">
                                  <Eye className="size-3.5" />
                                </Button>
                              </Link>
                              <Link href={`/${locale}/customers/${customer.id}/edit`}>
                                <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-primary">
                                  <Pencil className="size-3.5" />
                                </Button>
                              </Link>
                              <AlertDialog open={deleteTarget === customer.id} onOpenChange={(open) => setDeleteTarget(open ? customer.id : null)}>
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
                                    <AlertDialogAction onClick={() => handleDeleteCustomer(customer.id)} className="bg-destructive text-white hover:bg-destructive/90">
                                      {t('common.delete')}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

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
                  <ChevronLeft className="size-4 me-1" />
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
                  <ChevronRight className="size-4 ms-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
