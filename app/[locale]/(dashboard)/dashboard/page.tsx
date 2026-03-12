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
  ClipboardCheck,
  Star,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/PageHeader';
import { SectionLabel } from '@/components/ui/section-label';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';

interface DashboardData {
  stats: {
    totalCustomers: number;
    myCustomers: number;
    openTasks: number;
    overdueTasks: number;
    completedThisWeek: number;
    totalEstimatedValue?: number;
    totalWeightedValue?: number;
  };
  issues: {
    customersNoTasks: Array<{
      id: string;
      fullName: string;
      owner: { fullName: string };
    }>;
    customersNotUpdated: Array<{
      id: string;
      fullName: string;
      updatedAt: string;
      owner: { fullName: string };
    }>;
  };
  tasksToday: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    dueAt: string;
    customer: { id: string; fullName: string };
    assignedTo: { id: string; fullName: string };
  }>;
  employeeDistribution: Array<{
    id: string;
    fullName: string;
    jobTitle: string | null;
    customerCount: number;
    openTasksCount: number;
    completedInternalTasks: number;
    latestRating: number | null;
    onTimeRate: number | null;
    reviewPeriod: string | null;
  }>;
}

export default function DashboardPage() {
  const t = useTranslations();
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await fetch('/api/dashboard/summary');
        if (!response.ok) throw new Error('Failed to fetch');
        const result = await response.json();
        setData(result.data);
      } catch {
        toast.error(t('common.error'));
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [t]);

  const handleMarkAsDone = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DONE' }),
      });
      if (!response.ok) throw new Error('Failed to update task');
      toast.success(t('messages.updateSuccess', { entity: t('tasks.title') }));
      const dashboardResponse = await fetch('/api/dashboard/summary');
      if (dashboardResponse.ok) {
        const result = await dashboardResponse.json();
        setData(result.data);
      }
    } catch {
      toast.error(t('common.error'));
    }
  };

  const getPriorityConfig = (priority: string) => {
    const configs: Record<string, { color: string; label: string }> = {
      HIGH: { color: 'bg-red-50 text-red-700 border-red-200', label: t('tasks.priorityHigh') },
      MEDIUM: { color: 'bg-amber-50 text-amber-700 border-amber-200', label: t('tasks.priorityMedium') },
      LOW: { color: 'bg-gray-50 text-gray-700 border-gray-200', label: t('tasks.priorityLow') },
    };
    return configs[priority] || configs.MEDIUM;
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; icon: typeof Clock }> = {
      OPEN: { color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Clock },
      OVERDUE: { color: 'bg-red-50 text-red-700 border-red-200', icon: AlertTriangle },
      DONE: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    };
    return configs[status] || configs.OPEN;
  };

  // Loading
  if (loading) {
    return (
      <div className="p-3 md:p-3.5">
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0A3728, #0D6B52, #0F8566)' }}>
            <div className="px-8 py-7 flex items-center gap-5">
              <Skeleton className="w-14 h-14 rounded-2xl bg-white/10" />
              <div>
                <Skeleton className="h-6 w-40 bg-white/10 mb-2" />
                <Skeleton className="h-4 w-60 bg-white/10" />
              </div>
            </div>
          </div>
          <div className="p-5 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="bg-muted/30 rounded-2xl border border-border p-5">
                  <Skeleton className="h-10 w-10 rounded-xl mb-3" />
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3.5">
              <div className="bg-muted/30 rounded-2xl border border-border p-6">
                <Skeleton className="h-[300px] w-full rounded-xl" />
              </div>
              <div className="bg-muted/30 rounded-2xl border border-border p-6">
                <Skeleton className="h-[300px] w-full rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No data
  if (!data) {
    return (
      <div className="p-3 md:p-3.5">
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
              <AlertCircle className="size-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-muted-foreground">{t('common.noData')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const kpiCards = [
    {
      key: 'myCustomers',
      label: t('dashboard.myCustomers'),
      value: data.stats.myCustomers,
      icon: UserPlus,
      color: '#0F4C3A', bg: '#ECFDF5',
      trend: t('dashboard.myCustomers'), trendBg: '#D1FAE5', trendColor: '#065F46',
    },
    {
      key: 'overdue',
      label: t('dashboard.overdueTasks'),
      value: data.stats.overdueTasks,
      icon: AlertTriangle,
      color: '#BE123C', bg: '#FFF1F2',
      trend: data.stats.overdueTasks > 0 ? t('tasks.priorityHigh') : '0',
      trendBg: '#FFE4E6', trendColor: '#9F1239',
    },
    {
      key: 'openTasks',
      label: t('dashboard.openTasks'),
      value: data.stats.openTasks,
      icon: ClipboardCheck,
      color: '#D97706', bg: '#FFFBEB',
      trend: t('dashboard.openTasks'), trendBg: '#FEF3C7', trendColor: '#92400E',
    },
    {
      key: 'completed',
      label: t('dashboard.completedThisWeek'),
      value: data.stats.completedThisWeek,
      icon: CheckCircle2,
      color: '#059669', bg: '#ECFDF5',
      trend: t('dashboard.completedThisWeek'), trendBg: '#D1FAE5', trendColor: '#065F46',
    },
    {
      key: 'totalCustomers',
      label: t('dashboard.totalCustomers'),
      value: data.stats.totalCustomers,
      icon: UserCheck,
      color: '#6D28D9', bg: '#F5F3FF',
      trend: t('dashboard.totalCustomers'), trendBg: '#EDE9FE', trendColor: '#4C1D95',
    },
  ];

  const getDaysSinceUpdate = (updatedAt: string) => {
    return Math.floor((new Date().getTime() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24));
  };

  const GRADIENTS = [
    'linear-gradient(135deg, #0F4C3A, #0D9488)',
    'linear-gradient(135deg, #0369A1, #6D28D9)',
    'linear-gradient(135deg, #6D28D9, #BE123C)',
    'linear-gradient(135deg, #D97706, #059669)',
    'linear-gradient(135deg, #0D9488, #0369A1)',
  ];

  return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
      {/* ====== Hero Header ====== */}
      <div className="animate-fade-up-1">
        <PageHeader
          title={t('dashboard.title')}
          icon={LayoutDashboard}
          subtitle={`${t('dashboard.welcome')}${data.stats.openTasks > 0 ? ` — ${data.stats.openTasks} ${t('dashboard.openTasksSuffix')}` : ''}`}
        />
      </div>

      <div className="p-5 space-y-6">
      {/* ====== KPI Strip ====== */}
      <div className="animate-fade-up-2 grid grid-cols-2 md:grid-cols-5 gap-3">
        {kpiCards.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.key}
              className="bg-card rounded-2xl p-5 border border-border relative overflow-hidden
                         hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-default"
            >
              <div className="absolute top-0 end-0 w-[3px] h-full rounded-e-2xl"
                style={{ background: k.color }}
              />
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: k.bg }}
                >
                  <Icon size={17} style={{ color: k.color }} />
                </div>
              </div>
              <div className="text-[32px] font-black leading-none mb-1 tracking-tight"
                style={{ color: k.color }}
              >
                {k.value}
              </div>
              <div className="text-[11px] font-medium text-muted-foreground">{k.label}</div>
            </div>
          );
        })}
      </div>

      {/* ====== Main Grid: Tasks Today + Issues ====== */}
      <div className="animate-fade-up-3 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3.5">

        {/* Tasks Today */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                <CheckSquare size={15} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-foreground">{t('dashboard.tasksToday')}</p>
                <p className="text-[10px] text-muted-foreground">{t('dashboard.tasksToday')}</p>
              </div>
            </div>
            <span className="text-[10px] font-extrabold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">
              {data.tasksToday.length} {t('tasks.title')}
            </span>
          </div>

          {data.tasksToday.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14">
              <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                <CheckCircle2 size={24} className="text-emerald-500" />
              </div>
              <p className="text-sm font-semibold text-muted-foreground">{t('tasks.noTasks')}</p>
            </div>
          ) : (
            <div className="max-h-[460px] overflow-y-auto">
              {data.tasksToday.map((task) => {
                const priorityConfig = getPriorityConfig(task.priority);
                const statusConfig = getStatusConfig(task.status);
                const StatusIcon = statusConfig.icon;

                return (
                  <div key={task.id}
                    className="flex items-center justify-between px-5 py-3.5 border-b border-border/50 hover:bg-muted/30 transition-colors last:border-0"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #0F4C3A, #0D9488)' }}
                      >
                        {task.customer.fullName.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link href={`/${locale}/tasks/${task.id}`}
                          className="text-sm font-bold text-foreground hover:text-primary transition-colors block truncate"
                        >
                          {task.title}
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Link href={`/${locale}/customers/${task.customer.id}`}
                            className="text-[10px] text-muted-foreground hover:text-primary transition-colors"
                          >
                            {task.customer.fullName}
                          </Link>
                          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0 text-[9px] font-bold rounded-full border ${statusConfig.color}`}>
                            <StatusIcon className="size-2.5" />
                          </span>
                          <span className={`px-1.5 py-0 text-[9px] font-bold rounded-full border ${priorityConfig.color}`}>
                            {priorityConfig.label}
                          </span>
                        </div>
                      </div>
                    </div>
                    {(task.status === 'OPEN' || task.status === 'OVERDUE') && (
                      <Button
                        onClick={() => handleMarkAsDone(task.id)}
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[10px] text-success hover:text-success/80 hover:bg-success/10 shrink-0"
                      >
                        <CheckCircle2 className="size-3 me-1" />
                        {t('tasks.markAsDone')}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Issues Panel */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center">
                <AlertCircle size={15} className="text-rose-600" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-foreground">{t('dashboard.issues')}</p>
                <p className="text-[10px] text-muted-foreground">{t('dashboard.issues')}</p>
              </div>
            </div>
            <span className="text-[10px] font-extrabold bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full">
              {data.issues.customersNoTasks.length + data.issues.customersNotUpdated.length}
            </span>
          </div>

          <div className="max-h-[460px] overflow-y-auto">
            {/* Customers with no open tasks */}
            <div className="px-5 py-2 bg-muted/40 border-b border-border">
              <span className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest">
                {t('dashboard.customersNoTasks')}
              </span>
            </div>
            {data.issues.customersNoTasks.length === 0 ? (
              <div className="flex items-center gap-2 px-5 py-4 text-muted-foreground border-b border-border/50">
                <CheckCircle2 size={13} className="text-emerald-500" />
                <span className="text-xs">{t('common.noData')}</span>
              </div>
            ) : (
              data.issues.customersNoTasks.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center justify-between px-5 py-2.5 border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #0F4C3A, #0D9488)' }}
                    >
                      {c.fullName.charAt(0)}
                    </div>
                    <div>
                      <Link href={`/${locale}/customers/${c.id}`}
                        className="text-xs font-bold text-foreground hover:text-primary transition-colors"
                      >
                        {c.fullName}
                      </Link>
                      <p className="text-[10px] text-muted-foreground">{c.owner.fullName}</p>
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Customers not updated 7+ days */}
            <div className="px-5 py-2 bg-muted/40 border-b border-border">
              <span className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest">
                {t('dashboard.customersNotUpdated', { days: 7 })}
              </span>
            </div>
            {data.issues.customersNotUpdated.length === 0 ? (
              <div className="flex items-center gap-2 px-5 py-4 text-muted-foreground">
                <Clock size={13} />
                <span className="text-xs">{t('common.noData')}</span>
              </div>
            ) : (
              data.issues.customersNotUpdated.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center justify-between px-5 py-2.5 border-b border-border/50 hover:bg-muted/30 transition-colors last:border-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #D97706, #BE123C)' }}
                    >
                      {c.fullName.charAt(0)}
                    </div>
                    <Link href={`/${locale}/customers/${c.id}`}
                      className="text-xs font-bold text-foreground hover:text-primary transition-colors"
                    >
                      {c.fullName}
                    </Link>
                  </div>
                  <span className="text-[10px] font-bold text-rose-500">
                    {getDaysSinceUpdate(c.updatedAt)} {t('tasks.daysAgo')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ====== Employee Performance Table ====== */}
      {data.employeeDistribution.length > 0 && (
        <div className="animate-fade-up-4">
          <SectionLabel>{t('dashboard.employeeDistribution')}</SectionLabel>

          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Users size={15} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-foreground">{t('dashboard.employeeDistribution')}</p>
                  <p className="text-[10px] text-muted-foreground">{data.employeeDistribution.length} {t('users.title')}</p>
                </div>
              </div>
            </div>

            <DataTable
              rowKey={(row) => row.id}
              data={data.employeeDistribution}
              onRowClick={(emp) => router.push(`/${locale}/performance/${emp.id}`)}
              columns={[
                {
                  key: 'fullName',
                  header: t('users.fullName'),
                  render: (emp) => (
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                        style={{ background: GRADIENTS[data.employeeDistribution.indexOf(emp) % GRADIENTS.length] }}
                      >
                        {emp.fullName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{emp.fullName}</p>
                        {emp.jobTitle && <p className="text-xs text-muted-foreground">{emp.jobTitle}</p>}
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'customerCount',
                  header: t('customers.title'),
                  render: (emp) => (
                    <div>
                      <p className="text-lg font-black text-primary">{emp.customerCount}</p>
                    </div>
                  ),
                },
                {
                  key: 'openTasksCount',
                  header: t('dashboard.openTasks'),
                  render: (emp) => (
                    <StatusBadge
                      label={String(emp.openTasksCount)}
                      variant={emp.openTasksCount === 0 ? 'success' : emp.openTasksCount > 5 ? 'danger' : 'warning'}
                    />
                  ),
                },
                {
                  key: 'completedInternalTasks',
                  header: t('dashboard.completedThisWeek'),
                  render: (emp) => (
                    <span className="text-sm font-semibold text-foreground">{emp.completedInternalTasks}</span>
                  ),
                },
                {
                  key: 'onTimeRate',
                  header: t('performance.onTimeRate'),
                  render: (emp) => {
                    if (emp.onTimeRate === null) return <span className="text-xs text-muted-foreground">—</span>;
                    return (
                      <StatusBadge
                        label={`${emp.onTimeRate}%`}
                        variant={emp.onTimeRate >= 80 ? 'success' : emp.onTimeRate >= 50 ? 'warning' : 'danger'}
                        dot
                      />
                    );
                  },
                },
                {
                  key: 'latestRating',
                  header: t('performance.overallRating'),
                  render: (emp) => {
                    if (emp.latestRating === null) return <span className="text-xs text-muted-foreground">—</span>;
                    return (
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`size-3.5 ${emp.latestRating! >= s ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/25'}`} />
                        ))}
                      </div>
                    );
                  },
                },
              ]}
            />
          </div>
        </div>
      )}
      </div>
      </div>
    </div>
  );
}
