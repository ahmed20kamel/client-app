'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Download,
  BarChart2,
  Users,
  CheckCircle2,
  Clock,
  Filter,
  RefreshCw,
  Trophy,
  Zap,
  Loader2,
  Send,
  MessageSquare,
  FileText,
  XCircle,
  PhoneOff,
  CalendarCheck,
  LucideIcon,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { SectionLabel } from '@/components/ui/section-label';
import { PageHeader } from '@/components/PageHeader';

const STATUS_COLORS: Record<string, string> = {
  NEW_INQUIRY: '#0F4C3A',
  QUOTATION_SENT: '#0D9488',
  TECHNICAL_DISCUSSION: '#2563EB',
  NEGOTIATION: '#D97706',
  FINAL_OFFER: '#7C3AED',
  VERBAL_APPROVAL: '#0891B2',
  WON: '#059669',
  LOST: '#BE123C',
};

const STATUS_TRANSLATION_KEYS: Record<string, string> = {
  NEW_INQUIRY: 'reports.statusNewInquiry',
  QUOTATION_SENT: 'reports.statusQuotationSent',
  TECHNICAL_DISCUSSION: 'reports.statusTechnicalDiscussion',
  NEGOTIATION: 'reports.statusNegotiation',
  FINAL_OFFER: 'reports.statusFinalOffer',
  VERBAL_APPROVAL: 'reports.statusVerbalApproval',
  WON: 'reports.statusWon',
  LOST: 'reports.statusLost',
};

const STATUS_ICONS: Record<string, LucideIcon> = {
  NEW_INQUIRY: Users,
  QUOTATION_SENT: Send,
  TECHNICAL_DISCUSSION: MessageSquare,
  NEGOTIATION: FileText,
  FINAL_OFFER: Trophy,
  VERBAL_APPROVAL: CalendarCheck,
  WON: CheckCircle2,
  LOST: XCircle,
};

const STATUS_BG: Record<string, string> = {
  NEW_INQUIRY: '#ECFDF5',
  QUOTATION_SENT: '#F0FDFA',
  TECHNICAL_DISCUSSION: '#EFF6FF',
  NEGOTIATION: '#FFFBEB',
  FINAL_OFFER: '#F5F3FF',
  VERBAL_APPROVAL: '#ECFEFF',
  WON: '#ECFDF5',
  LOST: '#FFF1F2',
};

interface FunnelItem {
  status: string;
  count: number;
  percentage?: number;
}

interface FunnelData {
  funnel: FunnelItem[];
  summary?: {
    total: number;
    successRate: number;
    won: number;
    lost: number;
  };
}

interface OverdueTask {
  id: string;
  title: string;
  dueAt: string;
  priority: string;
  assignedTo?: { fullName: string };
}

interface NoFollowupCustomer {
  id: string;
  fullName: string;
  customerType: string;
  status: string;
  owner?: { fullName: string };
}

export default function ReportsPage() {
  const t = useTranslations();
  const params = useParams();
  const locale = params.locale as string;

  const [loading, setLoading] = useState(false);
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null);
  const [overdueData, setOverdueData] = useState<OverdueTask[]>([]);
  const [noFollowupData, setNoFollowupData] = useState<NoFollowupCustomer[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [customerType, setCustomerType] = useState('');

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const searchParams = new URLSearchParams();
      if (customerType) searchParams.set('customerType', customerType);
      if (from) searchParams.set('from', from);
      if (to) searchParams.set('to', to);

      const [funnelRes, overdueRes, noFollowupRes] = await Promise.all([
        fetch(`/api/reports/status-funnel?${searchParams.toString()}`),
        fetch(`/api/reports/overdue-tasks?${searchParams.toString()}`),
        fetch(`/api/reports/customers-no-followup?${searchParams.toString()}`),
      ]);

      const [funnel, overdue, noFollowup] = await Promise.all([
        funnelRes.ok ? funnelRes.json() : null,
        overdueRes.ok ? overdueRes.json() : null,
        noFollowupRes.ok ? noFollowupRes.json() : null,
      ]);

      setFunnelData(funnel?.data || null);
      setOverdueData(overdue?.data || []);
      setNoFollowupData(noFollowup?.data || []);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportToCSV = () => {
    if (!funnelData?.funnel) return;
    let csvContent = 'Status,Count,Percentage\n';
    funnelData.funnel.forEach((item: FunnelItem) => {
      csvContent += `"${item.status}","${item.count}","${item.percentage?.toFixed(1)}%"\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'reports.csv';
    link.click();
    toast.success(t('messages.exportSuccess'));
  };

  // Build KPI data from funnel
  const kpiData = useMemo(() => {
    if (!funnelData?.funnel) return [];
    return Object.keys(STATUS_COLORS).map(status => {
      const item = funnelData.funnel.find((f: FunnelItem) => f.status === status);
      return {
        key: status,
        label: t(STATUS_TRANSLATION_KEYS[status] || status),
        value: item?.count || 0,
        icon: STATUS_ICONS[status] || Users,
        color: STATUS_COLORS[status],
        bg: STATUS_BG[status],
      };
    });
  }, [funnelData, t]);

  const total = useMemo(() => kpiData.reduce((s, k) => s + k.value, 0) || 1, [kpiData]);

  // Funnel bars data (exclude WON/LOST for the conversion funnel)
  const funnelBars = useMemo(() => kpiData.filter(k => k.key !== 'LOST'), [kpiData]);

  const getDaysLate = (dueAt: string) => {
    const due = new Date(dueAt);
    const now = new Date();
    return Math.max(0, Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
      {/* ====== Hero Header ====== */}
      <PageHeader
        title={t('reports.title')}
        icon={BarChart2}
        subtitle={t('reports.heroSubtitle')}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-2">
              <Filter size={13} /> {t('reports.filter')}
            </Button>
            <Button variant="outline" size="sm" onClick={fetchAllData} disabled={loading} className="gap-2">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> {t('reports.refresh')}
            </Button>
            <Button size="sm" onClick={exportToCSV} disabled={!funnelData || loading} className="btn-premium gap-2">
              <Download size={13} /> {t('reports.exportReport')}
            </Button>
          </>
        }
      />

      <div className="p-5 space-y-6">
      {/* Collapsible Filters */}
      {showFilters && (
        <div className="bg-card rounded-2xl border border-border p-5 animate-fade-in">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[160px] flex-1">
              <Label className="text-xs text-muted-foreground mb-1.5 block">{t('reports.from')}</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10" />
            </div>
            <div className="min-w-[160px] flex-1">
              <Label className="text-xs text-muted-foreground mb-1.5 block">{t('reports.to')}</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10" />
            </div>
            <div className="min-w-[140px]">
              <Label className="text-xs text-muted-foreground mb-1.5 block">{t('customers.customerType')}</Label>
              <select
                value={customerType}
                onChange={(e) => setCustomerType(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border/60 bg-secondary/30 text-sm"
              >
                <option value="">{t('common.all')}</option>
                <option value="NEW">{t('customers.typeNew')}</option>
                <option value="EXISTING">{t('customers.typeExisting')}</option>
              </select>
            </div>
            <Button onClick={fetchAllData} disabled={loading} size="sm" className="btn-premium h-10 px-6">
              {loading ? <Loader2 className="size-4 animate-spin me-1.5" /> : <Zap className="size-4 me-1.5" />}
              {t('common.apply')}
            </Button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="bg-card rounded-2xl border border-border p-5">
                <Skeleton className="h-10 w-10 rounded-xl mb-3" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-3.5">
            <div className="bg-card rounded-2xl border border-border p-6">
              <Skeleton className="h-[250px] w-full rounded-xl" />
            </div>
            <div className="bg-card rounded-2xl border border-border p-6">
              <Skeleton className="h-[250px] w-full rounded-xl" />
            </div>
          </div>
        </div>
      )}

      {/* ====== Main Content ====== */}
      {!loading && funnelData && (
        <>
          {/* ====== KPI Cards ====== */}
          <div className="animate-fade-up-2">
            <SectionLabel>{t('reports.kpiSection')}</SectionLabel>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {kpiData.map((kpi) => {
                const pct = Math.round((kpi.value / total) * 100);
                const Icon = kpi.icon;
                return (
                  <div key={kpi.key}
                    className="bg-card rounded-2xl p-5 border border-border relative overflow-hidden
                               hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-default"
                  >
                    {/* Color accent bar */}
                    <div className="absolute top-0 end-0 w-[3px] h-full rounded-e-2xl"
                      style={{ background: kpi.color }}
                    />

                    <div className="flex items-start justify-between mb-3.5">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: kpi.bg }}
                      >
                        <Icon size={17} style={{ color: kpi.color }} />
                      </div>
                      <div className="text-end">
                        <p className="text-[11px] font-extrabold text-muted-foreground">
                          {pct}%
                        </p>
                        {/* Mini progress bar */}
                        <div className="w-9 h-[3px] rounded-full mt-1 bg-border">
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: kpi.color }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="text-[34px] font-black leading-none mb-1.5 tracking-tight"
                      style={{ color: kpi.color }}
                    >
                      {kpi.value}
                    </div>
                    <div className="text-xs font-medium text-muted-foreground">
                      {kpi.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ====== Charts Section ====== */}
          <div className="animate-fade-up-3">
            <SectionLabel>{t('reports.chartsSection')}</SectionLabel>

            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-3.5">
              {/* Success Rate Gauge */}
              <div className="bg-card rounded-2xl border border-border p-6">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <h3 className="text-[15px] font-extrabold text-foreground">{t('reports.successRate')}</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{t('reports.dealCompletion')}</p>
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground bg-muted border border-border px-2.5 py-1 rounded-lg">
                    {t('reports.thisMonth')}
                  </span>
                </div>

                <div className="flex flex-col items-center py-6">
                  <div className="relative w-40 h-40 mb-4">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="80" cy="80" r="68" fill="none" stroke="currentColor" strokeWidth="12" className="text-secondary" />
                      <circle cx="80" cy="80" r="68" fill="none" stroke="var(--primary)" strokeWidth="12" strokeLinecap="round"
                        strokeDasharray={`${(funnelData.summary?.successRate || 0) * 4.27} 427`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-black">{funnelData.summary?.successRate || 0}%</span>
                      <span className="text-[11px] text-muted-foreground mt-0.5">{t('reports.successRate')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="text-lg font-black text-emerald-600">{funnelData.summary?.won || 0}</p>
                      <p className="text-[10px] font-bold text-muted-foreground">{t('reports.statusWon')}</p>
                    </div>
                    <div className="w-px h-8 bg-border" />
                    <div className="text-center">
                      <p className="text-lg font-black text-red-500">{funnelData.summary?.lost || 0}</p>
                      <p className="text-[10px] font-bold text-muted-foreground">{t('reports.statusLost')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Conversion Funnel - Horizontal Bars */}
              <div className="bg-card rounded-2xl border border-border p-6">
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <h3 className="text-[15px] font-extrabold text-foreground">{t('reports.conversionFunnel')}</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{t('reports.funnelDistribution')}</p>
                  </div>
                  <span className="text-[10px] font-bold bg-muted border border-border px-2.5 py-1 rounded-lg text-muted-foreground">
                    {t('reports.clientCount', { count: funnelData.summary?.total || 0 })}
                  </span>
                </div>
                <div className="space-y-3.5">
                  {funnelBars.map((kpi) => {
                    const maxVal = Math.max(...funnelBars.map(k => k.value), 1);
                    const barPct = Math.round((kpi.value / maxVal) * 100);
                    const pct = Math.round((kpi.value / total) * 100);
                    return (
                      <div key={kpi.key}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-foreground">{kpi.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-foreground">{kpi.value}</span>
                            <span className="text-[10px] font-bold text-muted-foreground">{pct}%</span>
                          </div>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${barPct}%`, background: kpi.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ====== Bottom Tables ====== */}
          <div className="animate-fade-up-4">
            <SectionLabel>{t('reports.tablesSection')}</SectionLabel>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
              {/* No Follow-up Customers */}
              <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                      <PhoneOff size={14} className="text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-foreground">{t('reports.noFollowupCustomers')}</p>
                      <p className="text-[10px] text-muted-foreground">{t('reports.needsUrgentContact')}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full">
                    {t('reports.clientCount', { count: noFollowupData.length })}
                  </span>
                </div>
                <div className="grid grid-cols-[2fr_1fr_1fr] px-5 py-2 bg-muted/40 border-b border-border">
                  <span className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest">{t('reports.customer')}</span>
                  <span className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest">{t('reports.responsible')}</span>
                  <span className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest">{t('reports.status')}</span>
                </div>
                {noFollowupData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="size-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-3">
                      <CheckCircle2 className="size-6 text-emerald-500" />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">{t('reports.allHaveFollowup')}</p>
                  </div>
                ) : (
                  <div className="max-h-[320px] overflow-y-auto">
                    {noFollowupData.slice(0, 10).map((c) => (
                      <div key={c.id} className="grid grid-cols-[2fr_1fr_1fr] px-5 py-3 border-b border-border/50 hover:bg-muted/30 transition-colors last:border-0">
                        <div>
                          <Link href={`/${locale}/customers/${c.id}`} className="text-sm font-bold text-foreground hover:text-primary transition-colors">
                            {c.fullName}
                          </Link>
                          <p className="text-[10px] text-muted-foreground">{c.customerType === 'NEW' ? t('customers.typeNew') : t('customers.typeExisting')}</p>
                        </div>
                        <span className="text-xs text-muted-foreground self-center">{c.owner?.fullName || '-'}</span>
                        <div className="self-center">
                          <Badge variant="secondary" className="text-[10px]">
                            {t(STATUS_TRANSLATION_KEYS[c.status] || 'reports.statusNewInquiry')}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Overdue Tasks */}
              <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
                      <Clock size={14} className="text-rose-600" />
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-foreground">{t('reports.overdueTasks')}</p>
                      <p className="text-[10px] text-muted-foreground">{t('reports.exceededDueDate')}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full">
                    {t('reports.tasksCount', { count: overdueData.length })}
                  </span>
                </div>
                <div className="grid grid-cols-[2fr_1fr_1fr] px-5 py-2 bg-muted/40 border-b border-border">
                  <span className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest">{t('reports.task')}</span>
                  <span className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest">{t('reports.responsible')}</span>
                  <span className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest">{t('reports.priority')}</span>
                </div>
                {overdueData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="size-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-3">
                      <CheckCircle2 className="size-6 text-emerald-500" />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">{t('reports.noOverdueTasks')}</p>
                  </div>
                ) : (
                  <div className="max-h-[320px] overflow-y-auto">
                    {overdueData.slice(0, 10).map((task, idx) => (
                      <div key={task.id || idx} className="grid grid-cols-[2fr_1fr_1fr] px-5 py-3 border-b border-border/50 hover:bg-muted/30 transition-colors last:border-0">
                        <div>
                          <Link href={`/${locale}/tasks/${task.id}`} className="text-sm font-bold text-foreground hover:text-primary transition-colors">
                            {task.title}
                          </Link>
                          <p className="text-[10px] text-rose-500 font-semibold">
                            {t('reports.daysLate', { days: getDaysLate(task.dueAt) })}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground self-center">{task.assignedTo?.fullName || '-'}</span>
                        <div className="self-center">
                          <Badge
                            variant={task.priority === 'HIGH' ? 'destructive' : 'secondary'}
                            className={
                              task.priority === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border border-amber-200 text-[10px]' :
                              task.priority === 'LOW' ? 'bg-blue-50 text-blue-700 border border-blue-200 text-[10px]' : 'text-[10px]'
                            }
                          >
                            {task.priority === 'HIGH' ? t('tasks.priorityHigh') : task.priority === 'MEDIUM' ? t('tasks.priorityMedium') : t('tasks.priorityLow')}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* No Data State */}
      {!loading && !funnelData && (
        <div className="bg-card rounded-2xl border border-border">
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <div className="size-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-5">
              <BarChart2 className="size-10 text-muted-foreground/40" />
            </div>
            <p className="text-lg font-semibold mb-1">{t('common.noData')}</p>
            <p className="text-sm text-muted-foreground">{t('reports.noData')}</p>
          </div>
        </div>
      )}
      </div>
      </div>
    </div>
  );
}
