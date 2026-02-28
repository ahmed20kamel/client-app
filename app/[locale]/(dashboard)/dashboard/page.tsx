'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Users,
  UserCheck,
  CheckSquare,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Loader2,
} from 'lucide-react';

interface DashboardData {
  stats: {
    totalCustomers: number;
    myCustomers: number;
    openTasks: number;
    overdueTasks: number;
    completedThisWeek: number;
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
    customerCount: number;
  }>;
}

export default function DashboardPage() {
  const t = useTranslations();
  const params = useParams();
  const locale = params.locale as string;

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await fetch('/api/dashboard/summary');

        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        const result = await response.json();
        setData(result.data);
      } catch (error) {
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

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      toast.success(t('messages.updateSuccess', { entity: t('tasks.title') }));

      const dashboardResponse = await fetch('/api/dashboard/summary');
      if (dashboardResponse.ok) {
        const result = await dashboardResponse.json();
        setData(result.data);
      }
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <AlertCircle className="size-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-muted-foreground">{t('common.noData')}</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: t('dashboard.totalCustomers'),
      value: data.stats.totalCustomers,
      icon: Users,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-500/10',
    },
    {
      label: t('dashboard.myCustomers'),
      value: data.stats.myCustomers,
      icon: UserCheck,
      iconColor: 'text-indigo-600',
      iconBg: 'bg-indigo-500/10',
    },
    {
      label: t('dashboard.openTasks'),
      value: data.stats.openTasks,
      icon: CheckSquare,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-500/10',
    },
    {
      label: t('dashboard.overdueTasks'),
      value: data.stats.overdueTasks,
      icon: AlertTriangle,
      iconColor: 'text-red-600',
      iconBg: 'bg-red-500/10',
      alert: data.stats.overdueTasks > 0,
    },
    {
      label: t('dashboard.completedThisWeek'),
      value: data.stats.completedThisWeek,
      icon: TrendingUp,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-500/10',
    },
  ];

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

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t('dashboard.title')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('dashboard.welcome')}
          {data.stats.openTasks > 0 && (
            <span> — {data.stats.openTasks} {t('dashboard.openTasksSuffix')}</span>
          )}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card
              key={index}
              className={`shadow-premium hover:shadow-premium-lg transition-all duration-300 hover:-translate-y-0.5 ${
                stat.alert ? 'ring-2 ring-red-500/20' : ''
              }`}
            >
              <CardContent className="pt-6 pb-5">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${stat.iconBg} shrink-0`}>
                    <Icon className={`size-5 ${stat.iconColor}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Issues Section */}
        <Card className="shadow-premium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="size-5 text-amber-600" />
              {t('dashboard.issues')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Customers with no tasks */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-sm">{t('dashboard.customersNoTasks')}</h3>
                <Badge
                  variant={data.issues.customersNoTasks.length > 0 ? 'destructive' : 'secondary'}
                  className={data.issues.customersNoTasks.length === 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}
                >
                  {data.issues.customersNoTasks.length}
                </Badge>
              </div>
              {data.issues.customersNoTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground bg-muted/50 rounded-xl p-3 text-center">{t('common.noData')}</p>
              ) : (
                <div className="space-y-2">
                  {data.issues.customersNoTasks.slice(0, 5).map((customer) => (
                    <div key={customer.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors">
                      <Link
                        href={`/${locale}/customers/${customer.id}`}
                        className="text-sm font-medium text-primary hover:underline truncate"
                      >
                        {customer.fullName}
                      </Link>
                      <span className="text-xs text-muted-foreground shrink-0 ms-2">{customer.owner.fullName}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Customers not updated */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-sm">{t('dashboard.customersNotUpdated', { days: 7 })}</h3>
                <Badge
                  variant={data.issues.customersNotUpdated.length > 0 ? 'default' : 'secondary'}
                  className={data.issues.customersNotUpdated.length > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}
                >
                  {data.issues.customersNotUpdated.length}
                </Badge>
              </div>
              {data.issues.customersNotUpdated.length === 0 ? (
                <p className="text-sm text-muted-foreground bg-muted/50 rounded-xl p-3 text-center">{t('common.noData')}</p>
              ) : (
                <div className="space-y-2">
                  {data.issues.customersNotUpdated.slice(0, 5).map((customer) => (
                    <div key={customer.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors">
                      <Link
                        href={`/${locale}/customers/${customer.id}`}
                        className="text-sm font-medium text-primary hover:underline truncate"
                      >
                        {customer.fullName}
                      </Link>
                      <span className="text-xs text-muted-foreground shrink-0 ms-2">
                        {Math.floor(
                          (new Date().getTime() - new Date(customer.updatedAt).getTime()) /
                            (1000 * 60 * 60 * 24)
                        )} {t('tasks.daysAgo')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tasks Today */}
        <Card className="shadow-premium">
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="size-5 text-primary" />
                {t('dashboard.tasksToday')}
              </CardTitle>
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                {data.tasksToday.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {data.tasksToday.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="size-12 text-emerald-400 mx-auto mb-3" />
                <p className="text-muted-foreground">{t('tasks.noTasks')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.tasksToday.map((task) => {
                  const priorityConfig = getPriorityConfig(task.priority);
                  const statusConfig = getStatusConfig(task.status);
                  const StatusIcon = statusConfig.icon;

                  return (
                    <div
                      key={task.id}
                      className="p-4 rounded-xl border border-border/60 hover:border-primary/30 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                        <Link
                          href={`/${locale}/tasks/${task.id}`}
                          className="font-medium text-foreground hover:text-primary transition-colors truncate min-w-0"
                        >
                          {task.title}
                        </Link>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${statusConfig.color}`}>
                            <StatusIcon className="size-3" />
                          </span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${priorityConfig.color}`}>
                            {priorityConfig.label}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Link
                          href={`/${locale}/customers/${task.customer.id}`}
                          className="text-sm text-muted-foreground hover:text-primary transition-colors"
                        >
                          {task.customer.fullName}
                        </Link>
                        {(task.status === 'OPEN' || task.status === 'OVERDUE') && (
                          <Button
                            onClick={() => handleMarkAsDone(task.id)}
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          >
                            <CheckCircle2 className="size-3.5 me-1" />
                            {t('tasks.markAsDone')}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Employee Distribution (Admin only) */}
      {data.employeeDistribution.length > 0 && (
        <Card className="mt-6 shadow-premium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="size-5 text-indigo-600" />
              {t('dashboard.employeeDistribution')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/30">
                    <th className="text-start py-3.5 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('users.fullName')}</th>
                    <th className="text-end py-3.5 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('customers.title')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.employeeDistribution.map((emp) => (
                    <tr key={emp.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                            {emp.fullName.charAt(0)}
                          </div>
                          <span className="font-medium text-sm">{emp.fullName}</span>
                        </div>
                      </td>
                      <td className="text-end py-3.5 px-6">
                        <Badge variant="secondary" className="bg-primary/10 text-primary font-bold">
                          {emp.customerCount}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
