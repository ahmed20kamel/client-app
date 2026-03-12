'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Users,
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
  ArrowRight,
  TrendingUp,
  CalendarClock,
  Activity,
  Zap,
  Target,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';

/* ─── Types ─── */
interface DashboardData {
  stats: {
    totalCustomers: number;
    myCustomers: number;
    openTasks: number;
    overdueTasks: number;
    completedThisWeek: number;
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
  'linear-gradient(135deg, #0F4C3A, #0D9488)',
  'linear-gradient(135deg, #0369A1, #6D28D9)',
  'linear-gradient(135deg, #6D28D9, #BE123C)',
  'linear-gradient(135deg, #D97706, #059669)',
  'linear-gradient(135deg, #0D9488, #0369A1)',
];

const PRIORITY_VARIANT: Record<string, 'danger' | 'warning' | 'default'> = {
  HIGH: 'danger', URGENT: 'danger', MEDIUM: 'warning', LOW: 'default',
};
const STATUS_VARIANT: Record<string, 'info' | 'warning' | 'success' | 'danger' | 'purple'> = {
  OPEN: 'info', IN_PROGRESS: 'warning', SUBMITTED: 'purple', DONE: 'success', OVERDUE: 'danger', APPROVED: 'success',
};

/* ─── Small Components ─── */
function Ava({ name, size = 'sm', gradient }: { name: string; size?: 'xs' | 'sm'; gradient?: string }) {
  const s = size === 'xs' ? 'w-6 h-6 text-[10px]' : 'w-7 h-7 text-[11px]';
  return (
    <div className={`${s} rounded-full flex items-center justify-center font-bold text-white shrink-0`}
      style={{ background: gradient || GRADIENTS[0] }}>
      {name.charAt(0)}
    </div>
  );
}

/* ─── Main ─── */
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
  const fmtDue = (d: string) => new Date(d).toLocaleDateString(locale === 'ar' ? 'ar-AE' : 'en-AE', { month: 'short', day: 'numeric' });

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="p-2 md:p-3 space-y-2">
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-1.5">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">
          <Skeleton className="lg:col-span-4 h-[300px] rounded-lg" />
          <Skeleton className="lg:col-span-4 h-[300px] rounded-lg" />
          <Skeleton className="lg:col-span-4 h-[300px] rounded-lg" />
        </div>
        <Skeleton className="h-[200px] rounded-lg" />
      </div>
    );
  }

  if (!data) return <EmptyState title={t('common.noData')} />;

  const totalIssues = data.issues.customersNoTasks.length + data.issues.customersNotUpdated.length;

  const kpiCards: Array<{
    key: string; label: string; value: number;
    icon: React.ElementType; accent: string; bg: string;
  }> = [
    { key: 'myCustomers',    label: t('dashboard.myCustomers'),        value: data.stats.myCustomers,       icon: UserPlus,       accent: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
    { key: 'overdue',        label: t('dashboard.overdueTasks'),       value: data.stats.overdueTasks,      icon: AlertTriangle,  accent: 'text-red-600 dark:text-red-400',          bg: 'bg-red-500/10' },
    { key: 'openTasks',      label: t('dashboard.openTasks'),          value: data.stats.openTasks,         icon: CalendarClock,  accent: 'text-amber-600 dark:text-amber-400',      bg: 'bg-amber-500/10' },
    { key: 'completed',      label: t('dashboard.completedThisWeek'), value: data.stats.completedThisWeek, icon: CheckCircle2,   accent: 'text-teal-600 dark:text-teal-400',        bg: 'bg-teal-500/10' },
    { key: 'totalCustomers', label: t('dashboard.totalCustomers'),     value: data.stats.totalCustomers,    icon: UserCheck,      accent: 'text-purple-600 dark:text-purple-400',    bg: 'bg-purple-500/10' },
    { key: 'pending',        label: t('dashboard.pendingApprovals'),   value: data.pendingApprovals,        icon: ShieldCheck,    accent: 'text-blue-600 dark:text-blue-400',        bg: 'bg-blue-500/10' },
  ];

  return (
    <div className="p-2 md:p-3">

      {/* ━━━ Compact Header ━━━ */}
      <div className="animate-fade-up-1 mb-2 flex items-center justify-between rounded-xl px-4 py-3"
        style={{ background: 'linear-gradient(135deg, #0A3728 0%, #0D6B52 60%, #0F8566 100%)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <LayoutDashboard size={18} className="text-[#2DD4BF]" />
          </div>
          <div>
            <h1 className="text-base font-black text-white leading-tight">{t('dashboard.title')}</h1>
            <p className="text-[11px] text-white/50">{t('dashboard.welcome')}</p>
          </div>
        </div>
        {data.stats.overdueTasks > 0 && (
          <div className="flex items-center gap-1.5 bg-red-500/20 border border-red-400/30 rounded-lg px-2.5 py-1">
            <AlertTriangle size={12} className="text-red-400" />
            <span className="text-[11px] font-bold text-red-300">{data.stats.overdueTasks} {t('dashboard.overdueTasks')}</span>
          </div>
        )}
      </div>

      {/* ━━━ KPI Strip ━━━ */}
      <div className="animate-fade-up-2 grid grid-cols-3 lg:grid-cols-6 gap-1.5 mb-2">
        {kpiCards.map(k => {
          const Icon = k.icon;
          return (
            <div key={k.key} className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5 hover:shadow-sm transition-shadow">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${k.bg}`}>
                <Icon size={14} className={k.accent} />
              </div>
              <div className="min-w-0">
                <p className={`text-lg font-black leading-none ${k.accent}`}>{k.value}</p>
                <p className="text-[10px] text-muted-foreground font-medium leading-tight truncate mt-0.5">{k.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ━━━ Main 3-Column Grid ━━━ */}
      <div className="animate-fade-up-3 grid grid-cols-1 lg:grid-cols-12 gap-2 mb-2">

        {/* ── COL 1: Tasks Today ── */}
        <div className="lg:col-span-4 rounded-xl border border-border bg-card overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/20">
            <div className="flex items-center gap-2">
              <CheckSquare size={13} className="text-primary" />
              <span className="text-xs font-bold text-foreground">{t('dashboard.tasksToday')}</span>
              <StatusBadge label={String(data.tasksToday.length)} variant="success" className="text-[9px] px-1.5 py-0" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[340px]">
            {data.tasksToday.length === 0 ? (
              <EmptyState icon={CheckCircle2} title={t('tasks.noTasks')} className="py-8" />
            ) : (
              <div className="divide-y divide-border/30">
                {data.tasksToday.map(task => (
                  <div key={task.id} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/30 transition-colors group">
                    <Ava name={task.customer.fullName} size="xs" />
                    <div className="min-w-0 flex-1">
                      <Link href={`/${locale}/tasks/${task.id}`} className="text-[12px] font-semibold text-foreground hover:text-primary transition-colors block truncate leading-tight">
                        {task.title}
                      </Link>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[9px] text-muted-foreground truncate max-w-[90px]">{task.customer.fullName}</span>
                        <StatusBadge label={task.priority} variant={PRIORITY_VARIANT[task.priority] || 'default'} className="text-[8px] px-1 py-0 leading-none" />
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <StatusBadge label={task.status} variant={STATUS_VARIANT[task.status] || 'default'} className="text-[8px] px-1 py-0" />
                      {(task.status === 'OPEN' || task.status === 'OVERDUE') && (
                        <Button onClick={() => handleMarkAsDone(task.id)} variant="ghost" size="icon" className="h-6 w-6 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 opacity-0 group-hover:opacity-100 transition-opacity">
                          <CheckCircle2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── COL 2: Internal Tasks ── */}
        <div className="lg:col-span-4 rounded-xl border border-border bg-card overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/20">
            <div className="flex items-center gap-2">
              <ClipboardList size={13} className="text-primary" />
              <span className="text-xs font-bold text-foreground">{t('dashboard.internalTasks')}</span>
              <StatusBadge label={String(data.recentInternalTasks.length)} variant="info" className="text-[9px] px-1.5 py-0" />
            </div>
            <Link href={`/${locale}/internal-tasks`} className="text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5">
              {t('common.viewAll')} <ChevronRight className="size-3 rtl:-scale-x-100" />
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[340px]">
            {data.recentInternalTasks.length === 0 ? (
              <EmptyState icon={ClipboardList} title={t('common.noData')} className="py-8" />
            ) : (
              <div className="divide-y divide-border/30">
                {data.recentInternalTasks.map(task => (
                  <Link key={task.id} href={`/${locale}/internal-tasks/${task.id}`} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/30 transition-colors">
                    <Ava name={task.assignedTo.fullName} size="xs" gradient={GRADIENTS[1]} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold text-foreground truncate leading-tight">{task.title}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5 truncate">
                        {task.assignedTo.fullName} <span className="text-muted-foreground/40">•</span> {task.createdBy.fullName}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <StatusBadge label={task.status.replace('_', ' ')} variant={STATUS_VARIANT[task.status] || 'default'} className="text-[8px] px-1 py-0" />
                      {task.dueAt && <span className="text-[9px] text-muted-foreground hidden md:block">{fmtDue(task.dueAt)}</span>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── COL 3: Attention Needed ── */}
        <div className="lg:col-span-4 rounded-xl border border-border bg-card overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/20">
            <div className="flex items-center gap-2">
              <AlertCircle size={13} className="text-destructive" />
              <span className="text-xs font-bold text-foreground">{t('dashboard.attentionNeeded')}</span>
              {totalIssues > 0 && <StatusBadge label={String(totalIssues)} variant="danger" className="text-[9px] px-1.5 py-0" />}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[340px]">
            {/* No tasks customers */}
            <div className="px-3 py-1.5 bg-muted/40 border-b border-border">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{t('dashboard.customersNoTasks')}</span>
            </div>
            {data.issues.customersNoTasks.length === 0 ? (
              <div className="flex items-center gap-1.5 px-3 py-2 text-muted-foreground border-b border-border/30">
                <CheckCircle2 size={10} className="text-emerald-500" /><span className="text-[10px]">{t('common.noData')}</span>
              </div>
            ) : (
              data.issues.customersNoTasks.slice(0, 4).map(c => (
                <Link key={c.id} href={`/${locale}/customers/${c.id}`} className="flex items-center gap-2 px-3 py-1.5 border-b border-border/30 hover:bg-muted/30 transition-colors">
                  <Ava name={c.fullName} size="xs" gradient={GRADIENTS[2]} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-foreground truncate">{c.fullName}</p>
                    <p className="text-[9px] text-muted-foreground">{c.owner.fullName}</p>
                  </div>
                </Link>
              ))
            )}

            {/* Not updated customers */}
            <div className="px-3 py-1.5 bg-muted/40 border-b border-border">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{t('dashboard.customersNotUpdated', { days: 7 })}</span>
            </div>
            {data.issues.customersNotUpdated.length === 0 ? (
              <div className="flex items-center gap-1.5 px-3 py-2 text-muted-foreground">
                <Clock size={10} /><span className="text-[10px]">{t('common.noData')}</span>
              </div>
            ) : (
              data.issues.customersNotUpdated.slice(0, 4).map(c => (
                <Link key={c.id} href={`/${locale}/customers/${c.id}`} className="flex items-center justify-between px-3 py-1.5 border-b border-border/30 hover:bg-muted/30 transition-colors last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <Ava name={c.fullName} size="xs" gradient={GRADIENTS[3]} />
                    <p className="text-[11px] font-semibold text-foreground truncate">{c.fullName}</p>
                  </div>
                  <StatusBadge label={`${daysSince(c.updatedAt)}d`} variant="danger" className="text-[8px] px-1 shrink-0" />
                </Link>
              ))
            )}

            {/* Pending Approvals */}
            {data.pendingApprovals > 0 && (
              <Link href={`/${locale}/internal-tasks?status=SUBMITTED`} className="block border-t border-border">
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors">
                  <div className="w-6 h-6 rounded-md bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                    <ShieldCheck size={11} className="text-amber-600 dark:text-amber-400" />
                  </div>
                  <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 flex-1">{data.pendingApprovals} {t('dashboard.pendingApprovals')}</span>
                  <ChevronRight size={12} className="text-amber-500 rtl:-scale-x-100" />
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ━━━ Employee Performance — Compact Table ━━━ */}
      {data.employeeDistribution.length > 0 && (
        <div className="animate-fade-up-4 rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/20">
            <div className="flex items-center gap-2">
              <TrendingUp size={13} className="text-primary" />
              <span className="text-xs font-bold text-foreground">{t('dashboard.teamOverview')}</span>
              <StatusBadge label={String(data.employeeDistribution.length)} variant="purple" className="text-[9px] px-1.5 py-0" />
            </div>
            <Link href={`/${locale}/performance`} className="text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5">
              {t('common.viewAll')} <ChevronRight className="size-3 rtl:-scale-x-100" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/20">
                  <th className="px-3 py-2 text-start text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{t('users.fullName')}</th>
                  <th className="px-2 py-2 text-start text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{t('customers.title')}</th>
                  <th className="px-2 py-2 text-start text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{t('dashboard.openTasks')}</th>
                  <th className="px-2 py-2 text-start text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{t('dashboard.completedThisWeek')}</th>
                  <th className="px-2 py-2 text-start text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{t('performance.onTimeRate')}</th>
                  <th className="px-2 py-2 text-start text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{t('performance.overallRating')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {data.employeeDistribution.map((emp, i) => (
                  <tr key={emp.id} onClick={() => router.push(`/${locale}/performance/${emp.id}`)} className="hover:bg-muted/20 transition-colors cursor-pointer">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Ava name={emp.fullName} size="xs" gradient={GRADIENTS[i % GRADIENTS.length]} />
                        <div>
                          <p className="text-[12px] font-semibold text-foreground leading-tight">{emp.fullName}</p>
                          {emp.jobTitle && <p className="text-[9px] text-muted-foreground">{emp.jobTitle}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <span className="text-sm font-black text-primary">{emp.customerCount}</span>
                    </td>
                    <td className="px-2 py-2">
                      <StatusBadge label={String(emp.openTasksCount)} variant={emp.openTasksCount === 0 ? 'success' : emp.openTasksCount > 5 ? 'danger' : 'warning'} className="text-[9px] px-1.5 py-0" />
                    </td>
                    <td className="px-2 py-2">
                      <span className="text-[12px] font-semibold text-foreground">{emp.completedInternalTasks}</span>
                    </td>
                    <td className="px-2 py-2">
                      {emp.onTimeRate == null
                        ? <span className="text-[10px] text-muted-foreground">—</span>
                        : <StatusBadge label={`${emp.onTimeRate}%`} variant={emp.onTimeRate >= 80 ? 'success' : emp.onTimeRate >= 50 ? 'warning' : 'danger'} dot className="text-[9px] px-1.5 py-0" />
                      }
                    </td>
                    <td className="px-2 py-2">
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
