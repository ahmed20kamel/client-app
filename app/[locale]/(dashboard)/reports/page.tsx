'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  AreaChart,
  Area,
  ComposedChart,
  Line,
} from 'recharts';
import {
  Download,
  BarChart3,
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  RefreshCw,
  Target,
  Trophy,
  Zap,
  Loader2,
} from 'lucide-react';

type ReportType = 'overdue' | 'noFollowup' | 'newCustomers' | 'taskCompletion' | 'statusFunnel';

const STATUS_COLORS: Record<string, string> = {
  NEW: '#6366f1',
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

  const [activeReport, setActiveReport] = useState<ReportType>('statusFunnel');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

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
    { id: 'statusFunnel', label: t('reports.statusFunnel'), icon: Target },
    { id: 'taskCompletion', label: t('reports.taskCompletion'), icon: Trophy },
    { id: 'newCustomers', label: t('reports.newCustomers'), icon: TrendingUp },
    { id: 'overdue', label: t('reports.overdueTasks'), icon: AlertTriangle },
    { id: 'noFollowup', label: t('reports.customersNoFollowup'), icon: Clock },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-border rounded-xl p-3 shadow-lg text-sm">
          <p className="font-semibold text-foreground mb-1.5">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div className="size-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-semibold text-foreground">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const showDateFilters = activeReport === 'newCustomers' || activeReport === 'taskCompletion' || activeReport === 'statusFunnel';
  const showCustomerType = activeReport !== 'newCustomers' && activeReport !== 'taskCompletion';

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('reports.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('reports.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchReport} disabled={loading} size="sm">
            <RefreshCw className={`size-4 me-1.5 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
          <Button onClick={exportToCSV} disabled={!reportData || loading} size="sm" className="btn-premium">
            <Download className="size-4 me-1.5" />
            {t('common.export')}
          </Button>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {reportTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeReport === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveReport(tab.id as ReportType)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                  : 'bg-white border border-border text-muted-foreground hover:text-foreground hover:border-primary/30'
              }`}
            >
              <Icon className="size-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="shadow-premium mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="size-4 text-primary" />
            {t('common.filter')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {showDateFilters && (
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
            {showCustomerType && (
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
              <Button onClick={fetchReport} disabled={loading} className="w-full btn-premium">
                {loading ? <Loader2 className="size-4 animate-spin me-1.5" /> : <Zap className="size-4 me-1.5" />}
                {t('common.apply')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <Card className="shadow-premium">
          <CardContent className="flex items-center justify-center py-20">
            <Loader2 className="size-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      )}

      {/* No Data */}
      {!loading && !reportData && (
        <Card className="shadow-premium">
          <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <BarChart3 className="size-16 mb-4 text-muted-foreground/30" />
            <p className="text-lg font-medium">{t('common.noData')}</p>
          </CardContent>
        </Card>
      )}

      {/* Reports Content */}
      {!loading && reportData && (
        <div className="space-y-6">
          {/* ===== Status Funnel ===== */}
          {activeReport === 'statusFunnel' && reportData.funnel && (
            <>
              {/* Status Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(STATUS_COLORS).map(([status, color]) => {
                  const item = reportData.funnel?.find((f: any) => f.status === status);
                  const count = item?.count || 0;
                  return (
                    <Card key={status} className="shadow-premium hover:shadow-premium-lg transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="size-3 rounded-full" style={{ backgroundColor: color }} />
                          <span className="text-xs text-muted-foreground font-medium">{item?.percentage?.toFixed(0) || 0}%</span>
                        </div>
                        <p className="text-3xl font-bold">{count}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t(STATUS_TRANSLATION_KEYS[status] || status)}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie Chart */}
                <Card className="shadow-premium">
                  <CardHeader>
                    <CardTitle className="text-base">{t('reports.customerStatusDistribution')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={reportData.funnel}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={105}
                          paddingAngle={4}
                          dataKey="count"
                          nameKey="status"
                        >
                          {reportData.funnel.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || '#94a3b8'} stroke="transparent" />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap justify-center gap-4 mt-2">
                      {reportData.funnel.map((entry: any) => (
                        <div key={entry.status} className="flex items-center gap-2">
                          <div className="size-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[entry.status] || '#94a3b8' }} />
                          <span className="text-xs text-muted-foreground">{t(STATUS_TRANSLATION_KEYS[entry.status] || entry.status)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Success Rate */}
                <Card className="shadow-premium">
                  <CardHeader>
                    <CardTitle className="text-base">{t('reports.successRate')}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <div className="relative w-44 h-44">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="88" cy="88" r="76" fill="none" stroke="currentColor" strokeWidth="14" className="text-secondary" />
                        <circle cx="88" cy="88" r="76" fill="none" stroke="url(#successGradient)" strokeWidth="14" strokeLinecap="round"
                          strokeDasharray={`${(reportData.summary?.successRate || 0) * 4.77} 477`}
                        />
                        <defs>
                          <linearGradient id="successGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#22c55e" />
                            <stop offset="100%" stopColor="#16a34a" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-bold">{reportData.summary?.successRate || 0}%</span>
                        <span className="text-xs text-muted-foreground mt-1">{t('reports.successRate')}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Bar Chart */}
              <Card className="shadow-premium">
                <CardHeader>
                  <CardTitle className="text-base">{t('reports.conversionFunnel')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={reportData.funnel} layout="vertical" barSize={28}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <YAxis dataKey="status" type="category" axisLine={false} tickLine={false} width={100}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        tickFormatter={(value: string) => { const key = STATUS_TRANSLATION_KEYS[value]; return key ? t(key) : value; }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                        {reportData.funnel.map((entry: any, index: number) => (
                          <Cell key={`bar-${index}`} fill={STATUS_COLORS[entry.status] || '#94a3b8'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}

          {/* ===== Task Completion ===== */}
          {activeReport === 'taskCompletion' && Array.isArray(reportData) && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: t('reports.totalTasks'), value: reportData.reduce((a: number, b: any) => a + b.total, 0), icon: BarChart3, bg: 'bg-blue-50 text-blue-600' },
                  { label: t('reports.completed'), value: reportData.reduce((a: number, b: any) => a + b.completed, 0), icon: CheckCircle2, bg: 'bg-emerald-50 text-emerald-600' },
                  { label: t('reports.onTime'), value: reportData.reduce((a: number, b: any) => a + b.completedOnTime, 0), icon: Trophy, bg: 'bg-violet-50 text-violet-600' },
                  { label: t('reports.avgRate'), value: `${Math.round(reportData.reduce((a: number, b: any) => a + b.completionRate, 0) / (reportData.length || 1))}%`, icon: TrendingUp, bg: 'bg-amber-50 text-amber-600' },
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <Card key={idx} className="shadow-premium">
                      <CardContent className="p-5">
                        <div className={`size-10 rounded-xl ${item.bg} flex items-center justify-center mb-3`}>
                          <Icon className="size-5" />
                        </div>
                        <p className="text-2xl font-bold">{item.value}</p>
                        <p className="text-sm text-muted-foreground">{item.label}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Chart */}
              <Card className="shadow-premium">
                <CardHeader>
                  <CardTitle className="text-base">{t('reports.employeePerformance')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <ComposedChart data={reportData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="user.fullName" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar yAxisId="left" dataKey="total" name={t('reports.total')} fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={18} />
                      <Bar yAxisId="left" dataKey="completed" name={t('reports.completedLabel')} fill="#6366f1" radius={[4, 4, 0, 0]} barSize={18} />
                      <Line yAxisId="right" type="monotone" dataKey="completionRate" name={t('reports.rateLabel')} stroke="#22c55e" strokeWidth={2.5} dot={{ fill: '#22c55e', r: 4 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Table */}
              <Card className="shadow-premium overflow-hidden">
                <CardHeader className="border-b">
                  <CardTitle className="text-base">{t('reports.performanceDetails')}</CardTitle>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-start py-3 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('users.fullName')}</th>
                        <th className="text-center py-3 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('reports.total')}</th>
                        <th className="text-center py-3 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('reports.completedLabel')}</th>
                        <th className="text-center py-3 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('reports.onTimeLabel')}</th>
                        <th className="text-center py-3 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('reports.rateLabel')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {reportData.map((stat: any, idx: number) => (
                        <tr key={stat.user?.id || idx} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3.5 px-6">
                            <div className="flex items-center gap-3">
                              <div className="size-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                                {stat.user?.fullName?.charAt(0) || '?'}
                              </div>
                              <span className="font-medium text-sm">{stat.user?.fullName || '-'}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-6 text-center text-sm">{stat.total}</td>
                          <td className="py-3.5 px-6 text-center text-sm">{stat.completed}</td>
                          <td className="py-3.5 px-6 text-center text-sm">{stat.completedOnTime}</td>
                          <td className="py-3.5 px-6 text-center">
                            <Badge variant={stat.completionRate >= 80 ? 'default' : stat.completionRate >= 50 ? 'secondary' : 'destructive'}
                              className={stat.completionRate >= 80 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' : ''}>
                              {stat.completionRate}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}

          {/* ===== New Customers ===== */}
          {activeReport === 'newCustomers' && reportData.summary && (
            <>
              <Card className="shadow-premium bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Users className="size-7 text-primary" />
                  </div>
                  <div>
                    <p className="text-4xl font-bold">{reportData.customers?.length || 0}</p>
                    <p className="text-sm text-muted-foreground">{t('reports.totalNewCustomers')}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-premium">
                <CardHeader>
                  <CardTitle className="text-base">{t('reports.customerGrowth')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={reportData.summary}>
                      <defs>
                        <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="count" name={t('navigation.customers')} stroke="#6366f1" strokeWidth={2.5} fill="url(#colorGrowth)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}

          {/* ===== Overdue Tasks ===== */}
          {activeReport === 'overdue' && Array.isArray(reportData) && (
            <Card className="shadow-premium overflow-hidden">
              <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-red-50 flex items-center justify-center">
                    <AlertTriangle className="size-5 text-red-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{t('reports.overdueTasks')}</CardTitle>
                    <p className="text-sm text-muted-foreground">{reportData.length} {t('reports.overdueTasksCount')}</p>
                  </div>
                </div>
              </CardHeader>
              {reportData.length === 0 ? (
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <CheckCircle2 className="size-14 text-emerald-500 mb-4" />
                  <p className="text-muted-foreground font-medium">{t('reports.noOverdueTasks')}</p>
                </CardContent>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-start py-3 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('tasks.taskTitle')}</th>
                        <th className="text-start py-3 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('tasks.customer')}</th>
                        <th className="text-start py-3 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('tasks.priority')}</th>
                        <th className="text-start py-3 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('tasks.dueDate')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {reportData.map((task: any) => (
                        <tr key={task.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3.5 px-6">
                            <Link href={`/${locale}/tasks/${task.id}`} className="text-primary hover:underline font-medium text-sm">
                              {task.title}
                            </Link>
                          </td>
                          <td className="py-3.5 px-6 text-sm">{task.customer?.fullName || '-'}</td>
                          <td className="py-3.5 px-6">
                            <Badge variant={task.priority === 'HIGH' ? 'destructive' : 'secondary'}
                              className={task.priority === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border border-amber-200' : task.priority === 'LOW' ? 'bg-blue-50 text-blue-700 border border-blue-200' : ''}>
                              {task.priority === 'HIGH' ? t('tasks.priorityHigh') : task.priority === 'MEDIUM' ? t('tasks.priorityMedium') : t('tasks.priorityLow')}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-6 text-sm text-red-500 font-medium">
                            {new Date(task.dueAt).toLocaleDateString(locale === 'ar' ? 'ar-AE' : 'en-AE')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {/* ===== No Followup ===== */}
          {activeReport === 'noFollowup' && Array.isArray(reportData) && (
            <Card className="shadow-premium overflow-hidden">
              <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-amber-50 flex items-center justify-center">
                    <Clock className="size-5 text-amber-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{t('reports.customersNoFollowup')}</CardTitle>
                    <p className="text-sm text-muted-foreground">{reportData.length} {t('reports.customersCount')}</p>
                  </div>
                </div>
              </CardHeader>
              {reportData.length === 0 ? (
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <CheckCircle2 className="size-14 text-emerald-500 mb-4" />
                  <p className="text-muted-foreground font-medium">{t('reports.allHaveFollowup')}</p>
                </CardContent>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-start py-3 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('customers.fullName')}</th>
                        <th className="text-start py-3 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('customers.owner')}</th>
                        <th className="text-start py-3 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('customers.customerType')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {reportData.map((customer: any) => (
                        <tr key={customer.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3.5 px-6">
                            <Link href={`/${locale}/customers/${customer.id}`} className="text-primary hover:underline font-medium text-sm">
                              {customer.fullName}
                            </Link>
                          </td>
                          <td className="py-3.5 px-6 text-sm">{customer.owner?.fullName || '-'}</td>
                          <td className="py-3.5 px-6">
                            <Badge variant="secondary">{customer.customerType}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
