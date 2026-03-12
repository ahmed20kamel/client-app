'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Eye, Star, Award } from 'lucide-react';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';

interface PerformanceReview {
  id: string;
  period: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
  periodStart: string;
  periodEnd: string;
  overallRating: number;
  tasksCompleted: number;
  tasksOnTime: number;
  averageRating: number;
  strengths: string | null;
  improvements: string | null;
  notes: string | null;
  status: 'DRAFT' | 'PUBLISHED';
  createdAt: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    jobTitle: string | null;
  };
  reviewer: {
    id: string;
    fullName: string;
  };
}


export default function PerformancePage() {
  const t = useTranslations();
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();

  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', page.toString());
      if (period && period !== 'all') params.set('period', period);
      if (status && status !== 'all') params.set('status', status);

      const response = await fetch(`/api/performance?${params.toString()}`);
      if (!response.ok) {
        if (response.status === 403) {
          toast.error(t('messages.unauthorized'));
          return;
        }
        throw new Error('Failed to fetch reviews');
      }

      const data = await response.json();
      setReviews(data.data);
      setPagination(data.pagination);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, period, status]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'ar' ? 'ar-AE' : 'en-AE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getOnTimePercentage = (review: PerformanceReview) => {
    if (review.tasksCompleted === 0) return 0;
    return Math.round((review.tasksOnTime / review.tasksCompleted) * 100);
  };

  return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
      {/* Header */}
      <PageHeader
        title={t('performance.title')}
        icon={Award}
        subtitle={t('performance.subtitle')}
        actions={
          <Link href={`/${locale}/performance/new`}>
            <Button className="btn-premium">
              <Plus className="size-4" />
              {t('performance.createReview')}
            </Button>
          </Link>
        }
      />

      <div className="p-5 space-y-5">
      {/* Filters */}
      <Card className="shadow-premium mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <Select value={period} onValueChange={(v) => { setPeriod(v); setPage(1); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t('performance.period')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                <SelectItem value="MONTHLY">{t('performance.monthly')}</SelectItem>
                <SelectItem value="QUARTERLY">{t('performance.quarterly')}</SelectItem>
                <SelectItem value="ANNUAL">{t('performance.annual')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t('common.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                <SelectItem value="DRAFT">{t('performance.statusDraft')}</SelectItem>
                <SelectItem value="PUBLISHED">{t('performance.statusPublished')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={5} columns={6} />
      ) : reviews.length === 0 ? (
        <EmptyState title={t('performance.noReviews')} />
      ) : (
        <>
          <Card className="shadow-premium overflow-hidden">
            <DataTable
              rowKey={(r) => r.id}
              data={reviews}
              onRowClick={(r) => router.push(`/${locale}/performance/${r.user.id}`)}
              columns={[
                {
                  key: 'user',
                  header: t('performance.employeePerformance'),
                  render: (r) => (
                    <div>
                      <p className="text-sm font-semibold text-foreground">{r.user.fullName}</p>
                      {r.user.jobTitle && <p className="text-xs text-muted-foreground">{r.user.jobTitle}</p>}
                    </div>
                  ),
                },
                {
                  key: 'period',
                  header: t('performance.period'),
                  render: (r) => (
                    <div>
                      <StatusBadge label={t(`performance.${r.period.toLowerCase()}`)} variant="info" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(r.periodStart)} – {formatDate(r.periodEnd)}
                      </p>
                    </div>
                  ),
                },
                {
                  key: 'overallRating',
                  header: t('performance.overallRating'),
                  render: (r) => (
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={`size-4 ${r.overallRating >= s ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/25'}`} />
                      ))}
                    </div>
                  ),
                },
                {
                  key: 'tasksCompleted',
                  header: t('performance.tasksCompleted'),
                  render: (r) => <span className="text-sm font-medium">{r.tasksCompleted}</span>,
                },
                {
                  key: 'onTimeRate',
                  header: t('performance.onTimeRate'),
                  render: (r) => {
                    const pct = getOnTimePercentage(r);
                    return (
                      <StatusBadge
                        label={`${pct}%`}
                        variant={pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'danger'}
                        dot
                      />
                    );
                  },
                },
                {
                  key: 'status',
                  header: t('common.status'),
                  render: (r) => (
                    <StatusBadge
                      label={t(`performance.status${r.status.charAt(0) + r.status.slice(1).toLowerCase()}`)}
                      variant={r.status === 'PUBLISHED' ? 'success' : 'default'}
                      dot
                    />
                  ),
                },
                {
                  key: 'actions',
                  header: t('common.actions'),
                  headerClassName: 'text-end',
                  className: 'text-end',
                  render: (r) => (
                    <div onClick={(e) => e.stopPropagation()}>
                      <Link href={`/${locale}/performance/${r.user.id}`}>
                        <Button variant="ghost" size="icon-sm">
                          <Eye className="size-4" />
                        </Button>
                      </Link>
                    </div>
                  ),
                },
              ]}
            />
          </Card>

          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            limit={pagination.limit}
            onPageChange={setPage}
          />
        </>
      )}
      </div>
      </div>
    </div>
  );
}
