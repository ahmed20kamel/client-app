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
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/PageHeader';
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
function Ava({ name, gradient }: { name: string; gradient?: string }) {
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
      style={{ background: gradient || GRADIENTS[0] }}>
      {name.charAt(0)}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, count, countVariant = 'info', action }: {
  icon: React.ElementType; title: string; count?: number; countVariant?: 'info' | 'success' | 'danger' | 'warning' | 'purple';
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/20">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon size={13} className="text-primary" />
        </div>
        <h3 className="text-[13px] font-bold text-foreground">{title}</h3>
        {count != null && <StatusBadge label={String(count)} variant={countVariant} />}
      </div>
      {action}
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
      <div className="p-3 md:p-3.5">
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="rounded-t-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0A3728, #0D6B52, #0F8566)' }}>
            <div className="px-8 py-7 flex items-center gap-5">
              <Skeleton className="w-12 h-12 rounded-2xl bg-white/10" />
              <div><Skeleton className="h-5 w-40 bg-white/10 mb-2" /><Skeleton className="h-4 w-56 bg-white/10" /></div>
            </div>
          </div>
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[1,2,3,4,5,6].map(i => <div key={i} className="bg-muted/30 rounded-xl border p-4"><Skeleton className="h-8 w-12 mb-2" /><Skeleton className="h-3 w-20" /></div>)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {[1,2,3].map(i => <div key={i} className="bg-muted/20 rounded-xl border p-5"><Skeleton className="h-[200px] rounded-lg" /></div>)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return <EmptyState title={t('common.noData')} />;

  const kpiCards: Array<{
    key: string; label: string; value: number;
    icon: React.ElementType;
    color: string; iconBg: string; iconColor: string;
  }> = [
    { key: 'myCustomers',    label: t('dashboard.myCustomers'),        value: data.stats.myCustomers,       icon: UserPlus,       color: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-100 dark:bg-emerald-900/40', iconColor: 'text-emerald-600 dark:text-emerald-400' },
    { key: 'overdue',        label: t('dashboard.overdueTasks'),       value: data.stats.overdueTasks,      icon: AlertTriangle,  color: 'text-red-600 dark:text-red-400',          iconBg: 'bg-red-100 dark:bg-red-900/40',          iconColor: 'text-red-600 dark:text-red-400' },
    { key: 'openTasks',      label: t('dashboard.openTasks'),          value: data.stats.openTasks,         icon: CalendarClock,  color: 'text-amber-600 dark:text-amber-400',      iconBg: 'bg-amber-100 dark:bg-amber-900/40',      iconColor: 'text-amber-600 dark:text-amber-400' },
    { key: 'completed',      label: t('dashboard.completedThisWeek'), value: data.stats.completedThisWeek, icon: CheckCircle2,   color: 'text-teal-600 dark:text-teal-400',        iconBg: 'bg-teal-100 dark:bg-teal-900/40',        iconColor: 'text-teal-600 dark:text-teal-400' },
    { key: 'totalCustomers', label: t('dashboard.totalCustomers'),     value: data.stats.totalCustomers,    icon: UserCheck,      color: 'text-purple-600 dark:text-purple-400',    iconBg: 'bg-purple-100 dark:bg-purple-900/40',    iconColor: 'text-purple-600 dark:text-purple-400' },
    { key: 'pending',        label: t('dashboard.pendingApprovals'),   value: data.pendingApprovals,        icon: ShieldCheck,    color: 'text-blue-600 dark:text-blue-400',        iconBg: 'bg-blue-100 dark:bg-blue-900/40',        iconColor: 'text-blue-600 dark:text-blue-400' },
  ];

  return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">

        {/* ━━━ Header ━━━ */}
        <div className="animate-fade-up-1">
          <PageHeader
            title={t('dashboard.title')}
            icon={LayoutDashboard}
            subtitle={`${t('dashboard.welcome')}${data.stats.openTasks > 0 ? ` — ${data.stats.openTasks} ${t('dashboard.openTasksSuffix')}` : ''}`}
          />
        </div>

        <div className="p-5 space-y-5">

          {/* ━━━ KPI Strip ━━━ */}
          <div className="animate-fade-up-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {kpiCards.map(k => {
              const Icon = k.icon;
              return (
                <div key={k.key} className="relative rounded-xl border border-border bg-background p-4 hover:shadow-md transition-all group overflow-hidden">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${k.iconBg}`}>
                      <Icon size={16} className={k.iconColor} />
                    </div>
                  </div>
                  <p className={`text-2xl font-black leading-none mb-1 ${k.color}`}>{k.value}</p>
                  <p className="text-[11px] text-muted-foreground font-medium leading-tight">{k.label}</p>
                </div>
              );
            })}
          </div>

          {/* ━━━ Main Content: 2/3 + 1/3 layout ━━━ */}
          <div className="animate-fade-up-3 grid grid-cols-1 lg:grid-cols-5 gap-4">

            {/* ── LEFT: Tasks Today + Internal Tasks (stacked) ── */}
            <div className="lg:col-span-3 space-y-4">

              {/* Tasks Today */}
              <div className="rounded-xl border border-border overflow-hidden bg-background">
                <SectionHeader
                  icon={CheckSquare}
                  title={t('dashboard.tasksToday')}
                  count={data.tasksToday.length}
                  countVariant="success"
                />
                {data.tasksToday.length === 0 ? (
                  <EmptyState icon={CheckCircle2} title={t('tasks.noTasks')} className="py-10" />
                ) : (
                  <div className="divide-y divide-border/40">
                    {data.tasksToday.map(task => (
                      <div key={task.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                        <Ava name={task.customer.fullName} />
                        <div className="min-w-0 flex-1">
                          <Link href={`/${locale}/tasks/${task.id}`} className="text-sm font-semibold text-foreground hover:text-primary transition-colors block truncate">
                            {task.title}
                          </Link>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{task.customer.fullName}</span>
                            <StatusBadge label={task.status} variant={STATUS_VARIANT[task.status] || 'default'} className="text-[9px] px-1.5 py-0" />
                            <StatusBadge label={task.priority} variant={PRIORITY_VARIANT[task.priority] || 'default'} className="text-[9px] px-1.5 py-0" />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {task.dueAt && <span className="text-[10px] text-muted-foreground hidden sm:block">{fmtDue(task.dueAt)}</span>}
                          {(task.status === 'OPEN' || task.status === 'OVERDUE') && (
                            <Button onClick={() => handleMarkAsDone(task.id)} variant="ghost" size="icon-sm" className="text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
                              <CheckCircle2 className="size-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Internal Tasks */}
              <div className="rounded-xl border border-border overflow-hidden bg-background">
                <SectionHeader
                  icon={ClipboardList}
                  title={t('dashboard.internalTasks')}
                  count={data.recentInternalTasks.length}
                  countVariant="info"
                  action={
                    <Link href={`/${locale}/internal-tasks`}>
                      <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary">
                        {t('common.viewAll')} <ArrowRight className="size-3 ms-1 rtl:-scale-x-100" />
                      </Button>
                    </Link>
                  }
                />
                {data.recentInternalTasks.length === 0 ? (
                  <EmptyState icon={ClipboardList} title={t('common.noData')} className="py-10" />
                ) : (
                  <div className="divide-y divide-border/40">
                    {data.recentInternalTasks.map(task => (
                      <Link key={task.id} href={`/${locale}/internal-tasks/${task.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                        <Ava name={task.assignedTo.fullName} gradient={GRADIENTS[1]} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground truncate">{task.title}</p>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="text-[10px] text-muted-foreground">{task.assignedTo.fullName}</span>
                            <span className="text-[10px] text-muted-foreground/50">•</span>
                            <span className="text-[10px] text-muted-foreground">{t('dashboard.assignedBy')}: {task.createdBy.fullName}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <StatusBadge label={task.status.replace('_', ' ')} variant={STATUS_VARIANT[task.status] || 'default'} className="text-[9px] px-1.5 py-0" />
                          {task.dueAt && <span className="text-[10px] text-muted-foreground hidden sm:block">{fmtDue(task.dueAt)}</span>}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT: Attention Needed sidebar ── */}
            <div className="lg:col-span-2">
              <div className="rounded-xl border border-border overflow-hidden bg-background sticky top-4">
                <SectionHeader
                  icon={AlertCircle}
                  title={t('dashboard.attentionNeeded')}
                  count={data.issues.customersNoTasks.length + data.issues.customersNotUpdated.length}
                  countVariant="danger"
                />

                {/* Customers with no tasks */}
                <div className="px-4 py-2 bg-muted/40 border-b border-border">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('dashboard.customersNoTasks')}</span>
                </div>
                {data.issues.customersNoTasks.length === 0 ? (
                  <div className="flex items-center gap-2 px-4 py-3 text-muted-foreground border-b border-border/40">
                    <CheckCircle2 size={12} className="text-emerald-500" /><span className="text-xs">{t('common.noData')}</span>
                  </div>
                ) : (
                  data.issues.customersNoTasks.slice(0, 5).map(c => (
                    <Link key={c.id} href={`/${locale}/customers/${c.id}`} className="flex items-center gap-2.5 px-4 py-2.5 border-b border-border/40 hover:bg-muted/30 transition-colors">
                      <Ava name={c.fullName} gradient={GRADIENTS[2]} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground truncate">{c.fullName}</p>
                        <p className="text-[10px] text-muted-foreground">{c.owner.fullName}</p>
                      </div>
                    </Link>
                  ))
                )}

                {/* Customers not updated */}
                <div className="px-4 py-2 bg-muted/40 border-b border-border">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('dashboard.customersNotUpdated', { days: 7 })}</span>
                </div>
                {data.issues.customersNotUpdated.length === 0 ? (
                  <div className="flex items-center gap-2 px-4 py-3 text-muted-foreground">
                    <Clock size={12} /><span className="text-xs">{t('common.noData')}</span>
                  </div>
                ) : (
                  data.issues.customersNotUpdated.slice(0, 5).map(c => (
                    <Link key={c.id} href={`/${locale}/customers/${c.id}`} className="flex items-center justify-between px-4 py-2.5 border-b border-border/40 hover:bg-muted/30 transition-colors last:border-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Ava name={c.fullName} gradient={GRADIENTS[3]} />
                        <p className="text-xs font-semibold text-foreground truncate">{c.fullName}</p>
                      </div>
                      <StatusBadge label={`${daysSince(c.updatedAt)}d`} variant="danger" className="text-[9px] shrink-0" />
                    </Link>
                  ))
                )}

                {/* Pending Approvals mini-card */}
                {data.pendingApprovals > 0 && (
                  <Link href={`/${locale}/internal-tasks?status=SUBMITTED`} className="block border-t border-border">
                    <div className="flex items-center gap-3 px-4 py-3.5 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                        <ShieldCheck size={14} className="text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-amber-700 dark:text-amber-400">{data.pendingApprovals} {t('dashboard.pendingApprovals')}</p>
                        <p className="text-[10px] text-amber-600/70 dark:text-amber-500/70">{t('common.viewAll')}</p>
                      </div>
                      <ArrowRight size={14} className="text-amber-500 rtl:-scale-x-100" />
                    </div>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* ━━━ Employee Performance Table ━━━ */}
          {data.employeeDistribution.length > 0 && (
            <div className="animate-fade-up-4 rounded-xl border border-border overflow-hidden bg-background">
              <SectionHeader
                icon={TrendingUp}
                title={t('dashboard.teamOverview')}
                count={data.employeeDistribution.length}
                countVariant="purple"
                action={
                  <Link href={`/${locale}/performance`}>
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary">
                      {t('common.viewAll')} <ArrowRight className="size-3 ms-1 rtl:-scale-x-100" />
                    </Button>
                  </Link>
                }
              />
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/30">
                      <th className="px-5 py-3 text-start text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('users.fullName')}</th>
                      <th className="px-4 py-3 text-start text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('customers.title')}</th>
                      <th className="px-4 py-3 text-start text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('dashboard.openTasks')}</th>
                      <th className="px-4 py-3 text-start text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('dashboard.completedThisWeek')}</th>
                      <th className="px-4 py-3 text-start text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('performance.onTimeRate')}</th>
                      <th className="px-4 py-3 text-start text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('performance.overallRating')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {data.employeeDistribution.map((emp, i) => (
                      <tr key={emp.id} onClick={() => router.push(`/${locale}/performance/${emp.id}`)} className="hover:bg-muted/20 transition-colors cursor-pointer">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <Ava name={emp.fullName} gradient={GRADIENTS[i % GRADIENTS.length]} />
                            <div>
                              <p className="text-sm font-semibold text-foreground">{emp.fullName}</p>
                              {emp.jobTitle && <p className="text-[10px] text-muted-foreground">{emp.jobTitle}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-lg font-black text-primary">{emp.customerCount}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge label={String(emp.openTasksCount)} variant={emp.openTasksCount === 0 ? 'success' : emp.openTasksCount > 5 ? 'danger' : 'warning'} />
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-sm font-semibold text-foreground">{emp.completedInternalTasks}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          {emp.onTimeRate == null
                            ? <span className="text-xs text-muted-foreground">—</span>
                            : <StatusBadge label={`${emp.onTimeRate}%`} variant={emp.onTimeRate >= 80 ? 'success' : emp.onTimeRate >= 50 ? 'warning' : 'danger'} dot />
                          }
                        </td>
                        <td className="px-4 py-3.5">
                          {emp.latestRating == null
                            ? <span className="text-xs text-muted-foreground">—</span>
                            : (
                              <div className="flex gap-0.5">
                                {[1,2,3,4,5].map(s => (
                                  <Star key={s} className={`size-3.5 ${emp.latestRating! >= s ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/20'}`} />
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
      </div>
    </div>
  );
}
