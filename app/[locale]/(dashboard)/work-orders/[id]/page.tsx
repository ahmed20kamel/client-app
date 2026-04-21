'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import { toast } from 'sonner';
import {
  ClipboardList, ArrowLeft, Loader2, Package, Calendar,
  User, Phone, Building2, FileText, CheckCircle2, PlayCircle, Printer,
} from 'lucide-react';

interface WorkOrder {
  id: string;
  woNumber: string;
  projectName: string | null;
  engineerName: string | null;
  mobileNumber: string | null;
  workingDays: number;
  notes: string | null;
  status: string;
  createdAt: string;
  client: { id: string; companyName: string } | null;
  customer: { id: string; fullName: string } | null;
  quotation: { id: string; quotationNumber: string } | null;
  createdBy: { id: string; fullName: string };
  items: {
    id: string; description: string; quantity: number;
    length: number | null; linearMeters: number | null;
    size: string | null; unit: string | null; sortOrder: number;
  }[];
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  IN_PROGRESS: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  COMPLETED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export default function WorkOrderDetailPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const id = params.id as string;

  const [wo, setWo] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/work-orders/${id}`)
      .then(r => r.json())
      .then(({ data }) => setWo(data))
      .catch(() => toast.error(t('common.error')))
      .finally(() => setLoading(false));
  }, [id, t]);

  const updateStatus = async (status: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/work-orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      setWo(data);
      toast.success(t('common.save'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setActionLoading(false);
    }
  };

  const statusLabel = (s: string) => ({
    PENDING: t('workOrders.PENDING'),
    IN_PROGRESS: t('workOrders.IN_PROGRESS'),
    COMPLETED: t('workOrders.COMPLETED'),
    CANCELLED: t('workOrders.CANCELLED'),
  }[s] || s);

  const fmt = (d: string) => new Date(d).toLocaleDateString(locale === 'ar' ? 'ar-AE' : 'en-AE', { year: 'numeric', month: 'short', day: 'numeric' });

  if (loading) return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border p-16 flex justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    </div>
  );

  if (!wo) return null;

  return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <PageHeader
          title={wo.woNumber}
          subtitle={wo.projectName || t('workOrders.title')}
          icon={ClipboardList}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => window.open(`/${locale}/work-orders/${id}/print`, '_blank')}>
                <Printer className="size-3.5 me-1.5" />{t('common.export')}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => router.back()}>
                <ArrowLeft className="size-4 me-1 rtl:-scale-x-100" />{t('common.back')}
              </Button>
            </div>
          }
        />

        <div className="p-5 space-y-5">
          {/* Status bar */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <Badge className={`text-sm px-3 py-1 ${STATUS_COLORS[wo.status] || ''}`}>
              {statusLabel(wo.status)}
            </Badge>
            <div className="flex gap-2">
              {wo.status === 'PENDING' && (
                <Button size="sm" variant="outline" onClick={() => updateStatus('IN_PROGRESS')} disabled={actionLoading}>
                  <PlayCircle className="size-3.5 me-1.5" />{t('workOrders.markInProgress')}
                </Button>
              )}
              {wo.status === 'IN_PROGRESS' && (
                <Button size="sm" className="btn-premium" onClick={() => updateStatus('COMPLETED')} disabled={actionLoading}>
                  <CheckCircle2 className="size-3.5 me-1.5" />{t('workOrders.markCompleted')}
                </Button>
              )}
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Building2 className="size-4 text-primary" />{t('common.name')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {(wo.client || wo.customer) && (
                  <div className="flex items-start gap-2">
                    <Building2 className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] text-muted-foreground">{wo.client ? t('clients.title') : t('customers.title')}</p>
                      <p className="font-semibold">{wo.client?.companyName || wo.customer?.fullName}</p>
                    </div>
                  </div>
                )}
                {wo.engineerName && (
                  <div className="flex items-start gap-2">
                    <User className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] text-muted-foreground">{t('workOrders.engineerName')}</p>
                      <p className="font-semibold">{wo.engineerName}</p>
                    </div>
                  </div>
                )}
                {wo.mobileNumber && (
                  <div className="flex items-start gap-2">
                    <Phone className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] text-muted-foreground">{t('workOrders.mobileNumber')}</p>
                      <p className="font-semibold">{wo.mobileNumber}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Calendar className="size-4 text-primary" />{t('workOrders.workingDays')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-[11px] text-muted-foreground">{t('workOrders.daysToComplete')}</p>
                    <p className="font-bold text-lg text-primary">{wo.workingDays} {t('workOrders.workingDays')}</p>
                  </div>
                </div>
                {wo.quotation && (
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-muted-foreground" />
                    <div>
                      <p className="text-[11px] text-muted-foreground">{t('workOrders.sourceQuotation')}</p>
                      <Button variant="link" className="h-auto p-0 text-sm font-semibold"
                        onClick={() => router.push(`/${locale}/quotations/${wo.quotation!.id}`)}>
                        {wo.quotation.quotationNumber}
                      </Button>
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-[11px] text-muted-foreground">{t('common.createdAt')}</p>
                  <p className="font-semibold">{fmt(wo.createdAt)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Items */}
          <Card className="shadow-premium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="size-4 text-primary" />
                {t('workOrders.items')} ({wo.items.length})
              </CardTitle>
              <p className="text-xs text-amber-600 font-medium">{t('workOrders.noPrice')}</p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-4 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">#</th>
                      <th className="px-4 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">{t('workOrders.description')}</th>
                      <th className="px-3 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">{t('workOrders.size')}</th>
                      <th className="px-3 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">{t('workOrders.unit')}</th>
                      <th className="px-3 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">{t('workOrders.quantity')}</th>
                      <th className="px-3 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">{t('workOrders.totalLM')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {wo.items.map((item, i) => (
                      <tr key={item.id} className="hover:bg-muted/10">
                        <td className="px-4 py-3 text-sm text-muted-foreground">{i + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium">{item.description}</td>
                        <td className="px-3 py-3 text-center text-sm text-muted-foreground">{item.size || '—'}</td>
                        <td className="px-3 py-3 text-center text-sm text-muted-foreground">{item.unit || '—'}</td>
                        <td className="px-3 py-3 text-center text-sm font-medium">{item.quantity}</td>
                        <td className="px-3 py-3 text-center text-sm text-emerald-600 font-semibold">
                          {item.unit === 'LM' && item.linearMeters ? `${item.linearMeters.toFixed(2)} LM` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {wo.notes && (
            <Card className="shadow-sm">
              <CardContent className="pt-4">
                <p className="text-sm font-medium text-muted-foreground mb-1">{t('common.notes')}</p>
                <p className="text-sm">{wo.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
