'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart,
} from 'recharts';
import {
  Download,
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  Calendar,
  RefreshCw,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';

type ReportType = 'overdue' | 'noFollowup' | 'newCustomers' | 'taskCompletion' | 'statusFunnel';

// Premium gradient colors
const GRADIENT_COLORS = {
  primary: ['#6366f1', '#8b5cf6'],
  success: ['#22c55e', '#16a34a'],
  warning: ['#f59e0b', '#d97706'],
  danger: ['#ef4444', '#dc2626'],
  info: ['#3b82f6', '#2563eb'],
};

const STATUS_COLORS: Record<string, string> = {
  NEW: '#3b82f6',
  CONTACTED: '#8b5cf6',
  IN_PROGRESS: '#f59e0b',
  WON: '#22c55e',
  LOST: '#ef4444',
};

const STATUS_TRANSLATION_KEYS: Record<string, string> = {
  NEW: 'reports.statusNew',
  CONTACTED: 'reports.statusContacted',
  IN_PROGRESS: 'reports.statusInProgress',
  WON: 'reports.statusWon',
  LOST: 'reports.statusLost',
};

export default function ReportsPage() {
  const t = useTranslations();
  const params = useParams();
  const locale = params.locale as string;
  const isRTL = locale === 'ar';

  const [activeReport, setActiveReport] = useState<ReportType>('statusFunnel');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  // Filters
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [customerType, setCustomerType] = useState('');
  const [priority, setPriority] = useState('');
  const [groupBy, setGroupBy] = useState('day');

  const fetchReport = async () => {
    setLoading(true);
    try {
      let url = '';
      const searchParams = new URLSearchParams();

      if (activeReport === 'overdue') {
        url = '/api/reports/overdue-tasks';
        if (customerType) searchParams.set('customerType', customerType);
        if (priority) searchParams.set('priority', priority);
      } else if (activeReport === 'noFollowup') {
        url = '/api/reports/customers-no-followup';
        if (customerType) searchParams.set('customerType', customerType);
      } else if (activeReport === 'newCustomers') {
        url = '/api/reports/new-customers';
        if (from) searchParams.set('from', from);
        if (to) searchParams.set('to', to);
        if (groupBy) searchParams.set('groupBy', groupBy);
      } else if (activeReport === 'taskCompletion') {
        url = '/api/reports/task-completion';
        if (from) searchParams.set('from', from);
        if (to) searchParams.set('to', to);
      } else if (activeReport === 'statusFunnel') {
        url = '/api/reports/status-funnel';
        if (customerType) searchParams.set('customerType', customerType);
        if (from) searchParams.set('from', from);
        if (to) searchParams.set('to', to);
      }

      const response = await fetch(`${url}?${searchParams.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch report');
      const result = await response.json();
      setReportData(result.data);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeReport]);

  const exportToCSV = () => {
    if (!reportData) return;
    let csvContent = '';
    let filename = 'report.csv';

    if (activeReport === 'overdue') {
      filename = 'overdue-tasks.csv';
      csvContent = 'Task,Customer,Assigned To,Priority,Due Date\n';
      reportData.forEach((task: any) => {
        csvContent += `"${task.title}","${task.customer?.fullName || '-'}","${task.assignedTo?.fullName || '-'}","${task.priority}","${new Date(task.dueAt).toLocaleDateString(locale === 'ar' ? 'ar-AE' : 'en-AE')}"\n`;
      });
    } else if (activeReport === 'noFollowup') {
      filename = 'customers-no-followup.csv';
      csvContent = 'Customer,Owner,Type,Total Tasks\n';
      reportData.forEach((customer: any) => {
        csvContent += `"${customer.fullName}","${customer.owner?.fullName || '-'}","${customer.customerType}","${customer._count?.tasks || 0}"\n`;
      });
    } else if (activeReport === 'statusFunnel' && reportData.funnel) {
      filename = 'status-funnel.csv';
      csvContent = 'Status,Count,Percentage\n';
      reportData.funnel.forEach((item: any) => {
        csvContent += `"${item.status}","${item.count}","${item.percentage?.toFixed(1)}%"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    toast.success(t('messages.exportSuccess'));
  };

  const reportTabs = [
    { id: 'statusFunnel', label: t('reports.statusFunnel'), icon: Target, color: 'from-violet-500 to-purple-600' },
    { id: 'taskCompletion', label: t('reports.taskCompletion'), icon: Trophy, color: 'from-emerald-500 to-green-600' },
    { id: 'newCustomers', label: t('reports.newCustomers'), icon: TrendingUp, color: 'from-blue-500 to-indigo-600' },
    { id: 'overdue', label: t('reports.overdueTasks'), icon: AlertTriangle, color: 'from-red-500 to-rose-600' },
    { id: 'noFollowup', label: t('reports.customersNoFollowup'), icon: Clock, color: 'from-amber-500 to-orange-600' },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-xl p-4 shadow-xl">
          <p className="font-semibold text-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div className="size-3 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-semibold text-foreground">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('reports.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('reports.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={fetchReport} disabled={loading} size="sm">
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
          <Button onClick={exportToCSV} disabled={!reportData || loading} size="sm">
            <Download className="size-4" />
            {t('common.export')}
          </Button>
        </div>
      </div>

      {/* Report Type Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {reportTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeReport === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveReport(tab.id as ReportType)}
              className={`relative p-4 rounded-2xl border transition-all duration-300 text-start overflow-hidden group ${
                isActive
                  ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                  : 'border-border hover:border-primary/50 hover:bg-secondary/50'
              }`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${tab.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
              <div className={`size-10 rounded-xl bg-gradient-to-br ${tab.color} flex items-center justify-center mb-3 shadow-lg`}>
                <Icon className="size-5 text-white" />
              </div>
              <p className={`text-sm font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                {tab.label}
              </p>
              {isActive && (
                <div className="absolute bottom-0 start-0 end-0 h-1 bg-gradient-to-r from-primary to-primary/50" />
              )}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-background rounded-2xl border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Filter className="size-4 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground">{t('common.filter')}</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {(activeReport === 'newCustomers' || activeReport === 'taskCompletion' || activeReport === 'statusFunnel') && (
            <>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">{t('reports.from')}</Label>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">{t('reports.to')}</Label>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </>
          )}
          {activeReport === 'newCustomers' && (
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">{t('reports.groupBy')}</Label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-border/60 bg-secondary/30 text-sm"
              >
                <option value="day">{t('reports.day')}</option>
                <option value="week">{t('reports.week')}</option>
                <option value="month">{t('reports.month')}</option>
              </select>
            </div>
          )}
          {activeReport === 'overdue' && (
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">{t('tasks.priority')}</Label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-border/60 bg-secondary/30 text-sm"
              >
                <option value="">{t('common.all')}</option>
                <option value="LOW">{t('tasks.priorityLow')}</option>
                <option value="MEDIUM">{t('tasks.priorityMedium')}</option>
                <option value="HIGH">{t('tasks.priorityHigh')}</option>
              </select>
            </div>
          )}
          {(activeReport !== 'newCustomers' && activeReport !== 'taskCompletion') && (
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">{t('customers.customerType')}</Label>
              <select
                value={customerType}
                onChange={(e) => setCustomerType(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-border/60 bg-secondary/30 text-sm"
              >
                <option value="">{t('common.all')}</option>
                <option value="TYPE_A">{t('customers.typeA')}</option>
                <option value="TYPE_B">{t('customers.typeB')}</option>
                <option value="TYPE_C">{t('customers.typeC')}</option>
              </select>
            </div>
          )}
          <div className="flex items-end">
            <Button onClick={fetchReport} disabled={loading} className="w-full">
              {loading ? <RefreshCw className="size-4 animate-spin" /> : <Zap className="size-4" />}
              {t('common.apply')}
            </Button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-80">
          <div className="text-center">
            <div className="size-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">{t('common.loading')}</p>
          </div>
        </div>
      )}

      {/* No Data State */}
      {!loading && !reportData && (
        <div className="flex items-center justify-center h-80">
          <div className="text-center">
            <BarChart3 className="size-20 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground">{t('common.noData')}</p>
          </div>
        </div>
      )}

      {/* Reports Content */}
      {!loading && reportData && (
        <>
          {/* Status Funnel */}
          {activeReport === 'statusFunnel' && reportData.funnel && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(STATUS_COLORS).map(([status, color]) => {
                  const item = reportData.funnel?.find((f: any) => f.status === status);
                  const count = item?.count || 0;
                  return (
                    <div
                      key={status}
                      className="bg-background rounded-2xl border border-border p-5 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="size-3 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-xs text-muted-foreground">{item?.percentage?.toFixed(0) || 0}%</span>
                      </div>
                      <p className="text-3xl font-bold text-foreground">{count}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t(STATUS_TRANSLATION_KEYS[status] || status)}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie Chart */}
                <div className="bg-background rounded-2xl border border-border p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-6">
                    {t('reports.customerStatusDistribution')}
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={reportData.funnel}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={110}
                        paddingAngle={4}
                        dataKey="count"
                        nameKey="status"
                      >
                        {reportData.funnel.map((entry: any, index: number) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={STATUS_COLORS[entry.status] || '#94a3b8'}
                            stroke="transparent"
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Legend */}
                  <div className="flex flex-wrap justify-center gap-4 mt-4">
                    {reportData.funnel.map((entry: any) => (
                      <div key={entry.status} className="flex items-center gap-2">
                        <div
                          className="size-3 rounded-full"
                          style={{ backgroundColor: STATUS_COLORS[entry.status] || '#94a3b8' }}
                        />
                        <span className="text-sm text-muted-foreground">
                          {t(STATUS_TRANSLATION_KEYS[entry.status] || entry.status)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Success Rate Card */}
                <div className="bg-background rounded-2xl border border-border p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-6">
                    {t('reports.successRate')}
                  </h3>
                  <div className="flex flex-col items-center justify-center h-[300px]">
                    <div className="relative w-48 h-48">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="96"
                          cy="96"
                          r="80"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="16"
                          className="text-secondary"
                        />
                        <circle
                          cx="96"
                          cy="96"
                          r="80"
                          fill="none"
                          stroke="url(#successGradient)"
                          strokeWidth="16"
                          strokeLinecap="round"
                          strokeDasharray={`${(reportData.summary?.successRate || 0) * 5.02} 502`}
                        />
                        <defs>
                          <linearGradient id="successGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#22c55e" />
                            <stop offset="100%" stopColor="#16a34a" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-5xl font-bold text-foreground">
                          {reportData.summary?.successRate || 0}%
                        </span>
                        <span className="text-sm text-muted-foreground mt-1">
                          {t('reports.successRate')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Horizontal Bar Chart */}
              <div className="bg-background rounded-2xl border border-border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-6">
                  {t('reports.conversionFunnel')}
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reportData.funnel} layout="vertical" barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                    <XAxis type="number" axisLine={false} tickLine={false} />
                    <YAxis
                      dataKey="status"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      width={100}
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                      tickFormatter={(value: string) => {
                        const key = STATUS_TRANSLATION_KEYS[value];
                        return key ? t(key) : value;
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                      {reportData.funnel.map((entry: any, index: number) => (
                        <Cell key={`bar-${index}`} fill={STATUS_COLORS[entry.status] || '#94a3b8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Task Completion */}
          {activeReport === 'taskCompletion' && Array.isArray(reportData) && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: t('reports.totalTasks'), value: reportData.reduce((a: number, b: any) => a + b.total, 0), color: 'from-blue-500 to-indigo-600', icon: BarChart3 },
                  { label: t('reports.completed'), value: reportData.reduce((a: number, b: any) => a + b.completed, 0), color: 'from-emerald-500 to-green-600', icon: CheckCircle2 },
                  { label: t('reports.onTime'), value: reportData.reduce((a: number, b: any) => a + b.completedOnTime, 0), color: 'from-violet-500 to-purple-600', icon: Trophy },
                  { label: t('reports.avgRate'), value: `${Math.round(reportData.reduce((a: number, b: any) => a + b.completionRate, 0) / (reportData.length || 1))}%`, color: 'from-amber-500 to-orange-600', icon: TrendingUp },
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div key={idx} className="bg-background rounded-2xl border border-border p-5">
                      <div className={`size-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-3`}>
                        <Icon className="size-5 text-white" />
                      </div>
                      <p className="text-2xl font-bold text-foreground">{item.value}</p>
                      <p className="text-sm text-muted-foreground">{item.label}</p>
                    </div>
                  );
                })}
              </div>

              {/* Composed Chart */}
              <div className="bg-background rounded-2xl border border-border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-6">
                  {t('reports.employeePerformance')}
                </h3>
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={reportData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="user.fullName" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="total" name={t('reports.total')} fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar yAxisId="left" dataKey="completed" name={t('reports.completedLabel')} fill="#6366f1" radius={[4, 4, 0, 0]} barSize={20} />
                    <Line yAxisId="right" type="monotone" dataKey="completionRate" name={t('reports.rateLabel')} stroke="#22c55e" strokeWidth={3} dot={{ fill: '#22c55e', r: 5 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Data Table */}
              <div className="bg-background rounded-2xl border border-border overflow-hidden">
                <div className="p-6 border-b border-border">
                  <h3 className="text-lg font-semibold text-foreground">
                    {t('reports.performanceDetails')}
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-secondary/30">
                      <tr>
                        <th className="text-start py-4 px-6 text-sm font-semibold text-muted-foreground">{t('users.fullName')}</th>
                        <th className="text-center py-4 px-6 text-sm font-semibold text-muted-foreground">{t('reports.total')}</th>
                        <th className="text-center py-4 px-6 text-sm font-semibold text-muted-foreground">{t('reports.completedLabel')}</th>
                        <th className="text-center py-4 px-6 text-sm font-semibold text-muted-foreground">{t('reports.onTimeLabel')}</th>
                        <th className="text-center py-4 px-6 text-sm font-semibold text-muted-foreground">{t('reports.rateLabel')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.map((stat: any, idx: number) => (
                        <tr key={stat.user?.id || idx} className="border-b border-border/50 hover:bg-secondary/20">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="size-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-xs font-semibold">
                                {stat.user?.fullName?.charAt(0) || '?'}
                              </div>
                              <span className="font-medium text-foreground">{stat.user?.fullName || '-'}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-center text-foreground">{stat.total}</td>
                          <td className="py-4 px-6 text-center text-foreground">{stat.completed}</td>
                          <td className="py-4 px-6 text-center text-foreground">{stat.completedOnTime}</td>
                          <td className="py-4 px-6 text-center">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                              stat.completionRate >= 80 ? 'bg-emerald-500/10 text-emerald-600' :
                              stat.completionRate >= 50 ? 'bg-amber-500/10 text-amber-600' :
                              'bg-red-500/10 text-red-600'
                            }`}>
                              {stat.completionRate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* New Customers */}
          {activeReport === 'newCustomers' && reportData.summary && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white">
                  <Users className="size-10 mb-4 opacity-80" />
                  <p className="text-4xl font-bold">{reportData.customers?.length || 0}</p>
                  <p className="text-white/80 mt-1">{t('reports.totalNewCustomers')}</p>
                </div>
              </div>

              <div className="bg-background rounded-2xl border border-border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-6">
                  {t('reports.customerGrowth')}
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={reportData.summary}>
                    <defs>
                      <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="count" name={t('navigation.customers')} stroke="#6366f1" strokeWidth={3} fill="url(#colorGrowth)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Overdue Tasks */}
          {activeReport === 'overdue' && Array.isArray(reportData) && (
            <div className="bg-background rounded-2xl border border-border overflow-hidden">
              <div className="p-6 border-b border-border flex items-center gap-3">
                <div className="size-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="size-5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{t('reports.overdueTasks')}</h3>
                  <p className="text-sm text-muted-foreground">{reportData.length} {t('reports.overdueTasksCount')}</p>
                </div>
              </div>
              {reportData.length === 0 ? (
                <div className="p-12 text-center">
                  <CheckCircle2 className="size-16 text-emerald-500 mx-auto mb-4" />
                  <p className="text-muted-foreground">{t('reports.noOverdueTasks')}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-secondary/30">
                      <tr>
                        <th className="text-start py-4 px-6 text-sm font-semibold text-muted-foreground">{t('tasks.taskTitle')}</th>
                        <th className="text-start py-4 px-6 text-sm font-semibold text-muted-foreground">{t('tasks.customer')}</th>
                        <th className="text-start py-4 px-6 text-sm font-semibold text-muted-foreground">{t('tasks.priority')}</th>
                        <th className="text-start py-4 px-6 text-sm font-semibold text-muted-foreground">{t('tasks.dueDate')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.map((task: any) => (
                        <tr key={task.id} className="border-b border-border/50 hover:bg-secondary/20">
                          <td className="py-4 px-6">
                            <Link href={`/${locale}/tasks/${task.id}`} className="text-primary hover:underline font-medium">
                              {task.title}
                            </Link>
                          </td>
                          <td className="py-4 px-6 text-foreground">{task.customer?.fullName || '-'}</td>
                          <td className="py-4 px-6">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              task.priority === 'HIGH' ? 'bg-red-500/10 text-red-600' :
                              task.priority === 'MEDIUM' ? 'bg-amber-500/10 text-amber-600' :
                              'bg-blue-500/10 text-blue-600'
                            }`}>
                              {task.priority}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-red-500 font-medium">{new Date(task.dueAt).toLocaleDateString(locale === 'ar' ? 'ar-AE' : 'en-AE')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* No Followup */}
          {activeReport === 'noFollowup' && Array.isArray(reportData) && (
            <div className="bg-background rounded-2xl border border-border overflow-hidden">
              <div className="p-6 border-b border-border flex items-center gap-3">
                <div className="size-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Clock className="size-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{t('reports.customersNoFollowup')}</h3>
                  <p className="text-sm text-muted-foreground">{reportData.length} {t('reports.customersCount')}</p>
                </div>
              </div>
              {reportData.length === 0 ? (
                <div className="p-12 text-center">
                  <CheckCircle2 className="size-16 text-emerald-500 mx-auto mb-4" />
                  <p className="text-muted-foreground">{t('reports.allHaveFollowup')}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-secondary/30">
                      <tr>
                        <th className="text-start py-4 px-6 text-sm font-semibold text-muted-foreground">{t('customers.fullName')}</th>
                        <th className="text-start py-4 px-6 text-sm font-semibold text-muted-foreground">{t('customers.owner')}</th>
                        <th className="text-start py-4 px-6 text-sm font-semibold text-muted-foreground">{t('customers.customerType')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.map((customer: any) => (
                        <tr key={customer.id} className="border-b border-border/50 hover:bg-secondary/20">
                          <td className="py-4 px-6">
                            <Link href={`/${locale}/customers/${customer.id}`} className="text-primary hover:underline font-medium">
                              {customer.fullName}
                            </Link>
                          </td>
                          <td className="py-4 px-6 text-foreground">{customer.owner?.fullName || '-'}</td>
                          <td className="py-4 px-6">
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-secondary text-secondary-foreground">
                              {customer.customerType}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
