'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import { Loader2, ClipboardList, Search, Plus, Eye, Calendar, User } from 'lucide-react';
import { toast } from 'sonner';

interface WorkOrder {
  id: string;
  woNumber: string;
  projectName: string | null;
  engineerName: string | null;
  workingDays: number;
  status: string;
  createdAt: string;
  client: { id: string; companyName: string } | null;
  customer: { id: string; fullName: string } | null;
  quotation: { id: string; quotationNumber: string } | null;
  items: { id: string }[];
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  IN_PROGRESS: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  COMPLETED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export default function WorkOrdersPage() {
  const t = useTranslations();
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [total, setTotal] = useState(0);

  const fetchWorkOrders = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ search, ...(statusFilter && { status: statusFilter }) });
      const res = await fetch(`/api/work-orders?${q}`);
      const data = await res.json();
      setWorkOrders(data.data || []);
      setTotal(data.meta?.total || 0);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, t]);

  useEffect(() => { fetchWorkOrders(); }, [fetchWorkOrders]);

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      PENDING: t('workOrders.PENDING'),
      IN_PROGRESS: t('workOrders.IN_PROGRESS'),
      COMPLETED: t('workOrders.COMPLETED'),
      CANCELLED: t('workOrders.CANCELLED'),
    };
    return map[s] || s;
  };

  return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <PageHeader
          title={t('workOrders.title')}
          subtitle={`${total} ${t('workOrders.title').toLowerCase()}`}
          icon={ClipboardList}
          actions={
            <Button size="sm" className="btn-premium" onClick={() => router.push(`/${locale}/work-orders/new`)}>
              <Plus className="size-3.5 me-1.5" />{t('workOrders.new')}
            </Button>
          }
        />

        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('workOrders.searchPlaceholder')}
              className="ps-9"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">{t('common.status')}: {t('common.select')}</option>
            <option value="PENDING">{t('workOrders.PENDING')}</option>
            <option value="IN_PROGRESS">{t('workOrders.IN_PROGRESS')}</option>
            <option value="COMPLETED">{t('workOrders.COMPLETED')}</option>
            <option value="CANCELLED">{t('workOrders.CANCELLED')}</option>
          </select>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="size-8 animate-spin text-primary" /></div>
          ) : workOrders.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ClipboardList className="size-12 mx-auto mb-3 opacity-30" />
              <p>{t('workOrders.noWorkOrders')}</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {workOrders.map(wo => (
                <Card key={wo.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push(`/${locale}/work-orders/${wo.id}`)}>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-sm text-primary">{wo.woNumber}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {wo.client?.companyName || wo.customer?.fullName || '—'}
                        </p>
                      </div>
                      <Badge className={`text-[10px] shrink-0 ${STATUS_COLORS[wo.status] || ''}`}>
                        {statusLabel(wo.status)}
                      </Badge>
                    </div>

                    {wo.projectName && (
                      <p className="text-sm font-medium line-clamp-1">{wo.projectName}</p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" />{wo.workingDays} {t('workOrders.workingDays')}
                      </span>
                      {wo.engineerName && (
                        <span className="flex items-center gap-1">
                          <User className="size-3" />{wo.engineerName}
                        </span>
                      )}
                    </div>

                    {wo.quotation && (
                      <p className="text-xs text-muted-foreground">
                        {t('workOrders.sourceQuotation')}: <span className="font-medium text-foreground">{wo.quotation.quotationNumber}</span>
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-border/50">
                      <span className="text-xs text-muted-foreground">{wo.items.length} {t('workOrders.items').toLowerCase()}</span>
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                        <Eye className="size-3" />{t('common.view')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
