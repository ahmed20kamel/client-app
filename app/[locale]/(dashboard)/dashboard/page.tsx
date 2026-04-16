'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  UserCheck,
  UserPlus,
  CheckSquare,
  AlertTriangle,
  Clock,
  CheckCircle2,
  AlertCircle,
  LayoutDashboard,
  ClipboardList,
  Star,
  ShieldCheck,
  TrendingUp,
  Receipt,
  Banknote,
  CalendarClock,
  ChevronRight,
  Package,
  Building2,
  FileText,
  ArrowUpRight,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { intlLocale, fmtAmount } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';

/* ─── Types ─── */
interface DashboardData {
  stats: {
    totalCustomers: number;
    myCustomers: number;
    openTasks: number;
    overdueTasks: number;
    completedThisWeek: number;
    invoicedThisMonth: number;
    outstandingAmount: number;
    quotationConversionRate: number | null;
    activeProducts: number;
    totalClients: number;
    pendingQuotations: number;
  };
  issues: {
    customersNoTasks: Array<{ id: string; fullName: string; owner: { fullName: string } }>;
    customersNotUpdated: Array<{ id: string; fullName: string; updatedAt: string; owner: { fullName: string } }>;
  };
  tasksToday: Array<{
    id: string; title: string; status: string; priority: string; dueAt: string;
    customer: { id: string; fullName: string };
    assignedTo: { id: string; fullName: string };
  }>;
  recentInternalTasks: Array<{
    id: string; title: string; status: string; priority: string;
    dueAt: string | null; createdAt: string;
    assignedTo: { id: string; fullName: string };
    createdBy: { fullName: string };
  }>;
  pendingApprovals: number;
  employeeDistribution: Array<{
    id: string; fullName: string; jobTitle: string | null;
    customerCount: number; openTasksCount: number; completedInternalTasks: number;
    latestRating: number | null; onTimeRate: number | null;
  }>;
}

/* ─── Constants ─── */
const GRADIENTS = [
  'linear-gradient(135deg, #3730A3, #6366F1)',
  'linear-gradient(135deg, #0369A1, #6366F1)',
  'linear-gradient(135deg, #6366F1, #8B5CF6)',
  'linear-gradient(135deg, #0284C7, #3730A3)',
  'linear-gradient(135deg, #8B5CF6, #6366F1)',
];

const PRIORITY_VARIANT: Record<string, 'danger' | 'warning' | 'default'> = {
  HIGH: 'danger', URGENT: 'danger', MEDIUM: 'warning', LOW: 'default',
};
const STATUS_VARIANT: Record<string, 'info' | 'warning' | 'success' | 'danger' | 'purple'> = {
  OPEN: 'info', IN_PROGRESS: 'warning', SUBMITTED: 'purple', DONE: 'success', OVERDUE: 'danger', APPROVED: 'success',
};

/* ─── Sub-components ─── */
function Ava({ name, size = 'sm', gradient }: { name: string; size?: 'xs' | 'sm'; gradient?: string }) {
  const s = size === 'xs' ? 'w-6 h-6 text-[10px]' : 'w-7 h-7 text-[11px]';
  return (
    <div className={`${s} rounded-full flex items-center justify-center font-bold text-white shrink-0`}
      style={{ background: gradient || GRADIENTS[0] }}>
      {name.charAt(0)}
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent: string;
  bg: string;
  href?: string;
  sublabel?: string;
}
function KpiCard({ label, value, icon: Icon, accent, bg, href, sublabel }: KpiCardProps) {
  const inner = (
    <div className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-4 hover:shadow-md hover:border-primary/20 transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
          <Icon size={18} className={accent} />
        </div>
        {href && (
          <ArrowUpRight size={14} className="text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
        )}
      </div>
      <div>
        <p className={`text-2xl font-black leading-none ${accent}`}>{value}</p>
        <p className="text-xs text-muted-foreground font-medium mt-1.5 leading-tight">{label}</p>
        {sublabel && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{sublabel}</p>}
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

/* ─── Section Header ─── */
function SectionHeader({ icon: Icon, title, count, variant, href, locale }: {
  icon: React.ElementType; title: string; count?: number;
  variant?: 'success' | 'info' | 'danger' | 'purple' | 'warning';
  href?: string; locale: string;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/20">
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-primary" />
        <span className="text-xs font-bold text-foreground">{title}</span>
        {count !== undefined && (
          <StatusBadge label={String(count)} variant={variant || 'info'} className="text-[9px] px-1.5 py-0" />
        )}
      </div>
      {href && (
        <Link href={`/${locale}${href}`} className="text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5">
          View all <ChevronRight className="size-3 rtl:-scale-x-100" />
        </Link>
      )}
    </div>
  );
}

/* ─── Loading Skeleton ─── */
function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-16 rounded-xl" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {[1,2,3].map(i => <Skeleton key={i} className="h-72 rounded-xl" />)}
      </div>
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}

/* ─── Main Page ─── */
export default function DashboardPage() {
  const t = useTranslations();
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/summary')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(r => setData(r.data))
      .catch(() => toast.error(t('common.error')))
      .finally(() => setLoading(false));
  }, [t]);

  const handleMarkAsDone = async (taskId: string) => {
    try {
      const r = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DONE' }),
      });
      if (!r.ok) throw new Error();
      toast.success(t('messages.updateSuccess', { entity: t('tasks.title') }));
      const r2 = await fetch('/api/dashboard/summary');
      if (r2.ok) setData((await r2.json()).data);
    } catch { toast.error(t('common.error')); }
  };

  const daysSince = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  const fmtDue   = (d: string) => new Date(d).toLocaleDateString(intlLocale(locale), { month: 'short', day: 'numeric' });

  if (loading) return <DashboardSkeleton />;
  if (!data)   return <EmptyState title={t('common.noData')} />;

  const totalIssues = data.issues.customersNoTasks.length + data.issues.customersNotUpdated.length;

  type KpiEntry = KpiCardProps & { id: string };

  /* ── Financial KPI cards (admin) ── */
  const financialKpis: KpiEntry[] = [
    {
      id: 'invoiced',
      label: t('dashboard.invoicedThisMonth'),
      value: fmtAmount(data.stats.invoicedThisMonth, locale),
      icon: Receipt,
      accent: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-500/10',
      href: `/${locale}/tax-invoices`,
      sublabel: 'This month',
    },
    {
      id: 'outstanding',
      label: t('dashboard.outstandingAmount'),
      value: fmtAmount(data.stats.outstandingAmount, locale),
      icon: AlertCircle,
      accent: data.stats.outstandingAmount > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground',
      bg: data.stats.outstandingAmount > 0 ? 'bg-orange-500/10' : 'bg-muted/40',
      href: `/${locale}/accounts`,
    },
    {
      id: 'quotations',
      label: t('dashboard.quotationConversionRate'),
      value: data.stats.quotationConversionRate !== null ? `${data.stats.quotationConversionRate}%` : '—',
      icon: Banknote,
      accent: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-500/10',
      href: `/${locale}/quotations`,
      sublabel: 'Last 90 days',
    },
    {
      id: 'pendingQ',
      label: 'Pending Quotations',
      value: data.stats.pendingQuotations,
      icon: FileText,
      accent: data.stats.pendingQuotations > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground',
      bg: data.stats.pendingQuotations > 0 ? 'bg-amber-500/10' : 'bg-muted/40',
      href: `/${locale}/quotations`,
      sublabel: 'Draft + Sent',
    },
  ];

  /* ── Operational KPI cards ── */
  const operationalKpis: KpiEntry[] = [
    {
      id: 'totalCustomers',
      label: t('dashboard.totalCustomers'),
      value: data.stats.totalCustomers,
      icon: UserCheck,
      accent: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-500/10',
      href: `/${locale}/customers`,
    },
    {
      id: 'myCustomers',
      label: t('dashboard.myCustomers'),
      value: data.stats.myCustomers,
      icon: UserPlus,
      accent: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-500/10',
      href: `/${locale}/customers`,
    },
    {
      id: 'openTasks',
      label: t('dashboard.openTasks'),
      value: data.stats.openTasks,
      icon: CalendarClock,
      accent: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500/10',
      href: `/${locale}/tasks`,
    },
    {
      id: 'overdue',
      label: t('dashboard.overdueTasks'),
      value: data.stats.overdueTasks,
      icon: AlertTriangle,
      accent: data.stats.overdueTasks > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground',
      bg: data.stats.overdueTasks > 0 ? 'bg-red-500/10' : 'bg-muted/40',
      href: `/${locale}/tasks`,
    },
    {
      id: 'clients',
      label: 'Active Clients',
      value: data.stats.totalClients,
      icon: Building2,
      accent: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-500/10',
      href: `/${locale}/clients`,
    },
    {
      id: 'products',
      label: 'Active Products',
      value: data.stats.activeProducts,
      icon: Package,
      accent: 'text-sky-600 dark:text-sky-400',
      bg: 'bg-sky-500/10',
      href: `/${locale}/inventory`,
    },
  ];

  return (
    <div className="space-y-4">

      {/* ━━━ 1. PAGE HEADER ━━━ */}
      <div className="animate-fade-up-1 flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl px-5 py-4 gap-3"
        style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #3730A3 60%, #4F46E5 100%)' }}>
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <LayoutDashboard size={18} className="text-indigo-200" />
          </div>
          <div>
            <h1 className="text-base font-black text-white leading-tight">{t('dashboard.title')}</h1>
            <p className="text-xs text-white/50 mt-0.5">{t('dashboard.welcome')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {data.stats.overdueTasks > 0 && (
            <Link href={`/${locale}/tasks`}
              className="flex items-center gap-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 rounded-lg px-3 py-1.5 transition-colors">
              <AlertTriangle size={12} className="text-red-400" />
              <span className="text-xs font-bold text-red-300">{data.stats.overdueTasks} {t('dashboard.overdueTasks')}</span>
            </Link>
          )}
          {data.pendingApprovals > 0 && (
            <Link href={`/${locale}/approvals`}
              className="flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30 rounded-lg px-3 py-1.5 transition-colors">
              <ShieldCheck size={12} className="text-amber-400" />
              <span className="text-xs font-bold text-amber-300">{data.pendingApprovals} {t('dashboard.pendingApprovals')}</span>
            </Link>
          )}
        </div>
      </div>

      {/* ━━━ 2. FINANCIAL KPIs (Admin) ━━━ */}
      <div className="animate-fade-up-2">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-0.5">
          Financial Overview
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {financialKpis.map(({ id, ...k }) => <KpiCard key={id} {...k} />)}
        </div>
      </div>

      {/* ━━━ 3. OPERATIONAL KPIs ━━━ */}
      <div className="animate-fade-up-3">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-0.5">
          Operations
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {operationalKpis.map(({ id, ...k }) => <KpiCard key={id} {...k} />)}
        </div>
      </div>

      {/* ━━━ 4. LIVE ACTIVITY — 3 columns ━━━ */}
      <div className="animate-fade-up-4 grid grid-cols-1 lg:grid-cols-3 gap-3">

        {/* ── Tasks Today ── */}
        <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
          <SectionHeader
            icon={CheckSquare}
            title={t('dashboard.tasksToday')}
            count={data.tasksToday.length}
            variant="success"
            href="/tasks"
            locale={locale}
          />
          <div className="flex-1 overflow-y-auto max-h-72 divide-y divide-border/30">
            {data.tasksToday.length === 0 ? (
              <EmptyState icon={CheckCircle2} title={t('tasks.noTasks')} className="py-10" />
            ) : (
              data.tasksToday.map(task => (
                <div key={task.id} className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-muted/30 transition-colors group">
                  <Ava name={task.customer.fullName} size="xs" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/${locale}/tasks/${task.id}`}
                      className="text-[12px] font-semibold text-foreground hover:text-primary transition-colors block truncate">
                      {task.title}
                    </Link>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">{task.customer.fullName}</span>
                      <StatusBadge label={task.priority} variant={PRIORITY_VARIANT[task.priority] || 'default'} className="text-[8px] px-1 py-0" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <StatusBadge label={task.status} variant={STATUS_VARIANT[task.status] || 'default'} className="text-[8px] px-1 py-0" />
                    {(task.status === 'OPEN' || task.status === 'OVERDUE') && (
                      <Button onClick={() => handleMarkAsDone(task.id)} variant="ghost" size="icon"
                        className="h-6 w-6 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 opacity-0 group-hover:opacity-100 transition-opacity">
                        <CheckCircle2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Internal Tasks ── */}
        <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
          <SectionHeader
            icon={ClipboardList}
            title={t('dashboard.internalTasks')}
            count={data.recentInternalTasks.length}
            variant="info"
            href="/internal-tasks"
            locale={locale}
          />
          <div className="flex-1 overflow-y-auto max-h-72 divide-y divide-border/30">
            {data.recentInternalTasks.length === 0 ? (
              <EmptyState icon={ClipboardList} title={t('common.noData')} className="py-10" />
            ) : (
              data.recentInternalTasks.map(task => (
                <Link key={task.id} href={`/${locale}/internal-tasks/${task.id}`}
                  className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-muted/30 transition-colors">
                  <Ava name={task.assignedTo.fullName} size="xs" gradient={GRADIENTS[1]} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold text-foreground truncate">{task.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                      {task.assignedTo.fullName}
                      {task.dueAt && <span className="text-muted-foreground/50"> · {fmtDue(task.dueAt)}</span>}
                    </p>
                  </div>
                  <StatusBadge label={task.status.replace('_', ' ')} variant={STATUS_VARIANT[task.status] || 'default'} className="text-[8px] px-1 py-0 shrink-0" />
                </Link>
              ))
            )}
          </div>
        </div>

        {/* ── Alerts & Attention ── */}
        <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
          <SectionHeader
            icon={AlertCircle}
            title={t('dashboard.attentionNeeded')}
            count={totalIssues > 0 ? totalIssues : undefined}
            variant="danger"
            locale={locale}
          />
          <div className="flex-1 overflow-y-auto max-h-72">

            {/* No-task customers */}
            <div className="px-4 py-1.5 bg-muted/40 border-b border-border">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{t('dashboard.customersNoTasks')}</span>
            </div>
            {data.issues.customersNoTasks.length === 0 ? (
              <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border/30">
                <CheckCircle2 size={10} className="text-indigo-400" />
                <span className="text-[10px] text-muted-foreground">{t('common.noData')}</span>
              </div>
            ) : (
              data.issues.customersNoTasks.slice(0, 4).map(c => (
                <Link key={c.id} href={`/${locale}/customers/${c.id}`}
                  className="flex items-center gap-2.5 px-4 py-2 border-b border-border/30 hover:bg-muted/30 transition-colors">
                  <Ava name={c.fullName} size="xs" gradient={GRADIENTS[2]} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-foreground truncate">{c.fullName}</p>
                    <p className="text-[9px] text-muted-foreground">{c.owner.fullName}</p>
                  </div>
                </Link>
              ))
            )}

            {/* Stale customers */}
            <div className="px-4 py-1.5 bg-muted/40 border-b border-border">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{t('dashboard.customersNotUpdated', { days: 7 })}</span>
            </div>
            {data.issues.customersNotUpdated.length === 0 ? (
              <div className="flex items-center gap-1.5 px-4 py-2.5">
                <Clock size={10} className="text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{t('common.noData')}</span>
              </div>
            ) : (
              data.issues.customersNotUpdated.slice(0, 4).map(c => (
                <Link key={c.id} href={`/${locale}/customers/${c.id}`}
                  className="flex items-center justify-between px-4 py-2 border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Ava name={c.fullName} size="xs" gradient={GRADIENTS[3]} />
                    <p className="text-[11px] font-semibold text-foreground truncate">{c.fullName}</p>
                  </div>
                  <StatusBadge label={`${daysSince(c.updatedAt)}d`} variant="danger" className="text-[8px] px-1.5 shrink-0" />
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ━━━ 5. TEAM OVERVIEW ━━━ */}
      {data.employeeDistribution.length > 0 && (
        <div className="animate-fade-up-4 rounded-xl border border-border bg-card overflow-hidden">
          <SectionHeader
            icon={TrendingUp}
            title={t('dashboard.teamOverview')}
            count={data.employeeDistribution.length}
            variant="purple"
            href="/performance"
            locale={locale}
          />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/20 border-b border-border">
                  <th className="px-4 py-2.5 text-start text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{t('users.fullName')}</th>
                  <th className="px-3 py-2.5 text-start text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{t('customers.title')}</th>
                  <th className="px-3 py-2.5 text-start text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{t('dashboard.openTasks')}</th>
                  <th className="px-3 py-2.5 text-start text-[9px] font-bold text-muted-foreground uppercase tracking-wider hidden md:table-cell">{t('dashboard.completedThisWeek')}</th>
                  <th className="px-3 py-2.5 text-start text-[9px] font-bold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">{t('performance.onTimeRate')}</th>
                  <th className="px-3 py-2.5 text-start text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{t('performance.overallRating')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {data.employeeDistribution.map((emp, i) => (
                  <tr key={emp.id} onClick={() => router.push(`/${locale}/performance/${emp.id}`)}
                    className="hover:bg-muted/20 transition-colors cursor-pointer">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Ava name={emp.fullName} size="xs" gradient={GRADIENTS[i % GRADIENTS.length]} />
                        <div>
                          <p className="text-[12px] font-semibold text-foreground leading-tight">{emp.fullName}</p>
                          {emp.jobTitle && <p className="text-[9px] text-muted-foreground">{emp.jobTitle}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-sm font-black text-primary">{emp.customerCount}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge
                        label={String(emp.openTasksCount)}
                        variant={emp.openTasksCount === 0 ? 'success' : emp.openTasksCount > 5 ? 'danger' : 'warning'}
                        className="text-[9px] px-1.5 py-0"
                      />
                    </td>
                    <td className="px-3 py-2.5 hidden md:table-cell">
                      <span className="text-[12px] font-semibold text-foreground">{emp.completedInternalTasks}</span>
                    </td>
                    <td className="px-3 py-2.5 hidden lg:table-cell">
                      {emp.onTimeRate == null
                        ? <span className="text-[10px] text-muted-foreground">—</span>
                        : <StatusBadge
                            label={`${emp.onTimeRate}%`}
                            variant={emp.onTimeRate >= 80 ? 'success' : emp.onTimeRate >= 50 ? 'warning' : 'danger'}
                            dot
                            className="text-[9px] px-1.5 py-0"
                          />
                      }
                    </td>
                    <td className="px-3 py-2.5">
                      {emp.latestRating == null
                        ? <span className="text-[10px] text-muted-foreground">—</span>
                        : (
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(s => (
                              <Star key={s} className={`size-3 ${emp.latestRating! >= s ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/20'}`} />
                            ))}
                          </div>
                        )
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
