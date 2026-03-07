'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Plus,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Star,
  BarChart3,
  Award,
} from 'lucide-react';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { PageHeader } from '@/components/PageHeader';

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

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  DRAFT: { color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' },
  PUBLISHED: { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
};

const StarDisplay = ({ rating }: { rating: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        className={`size-4 ${rating >= star ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`}
      />
    ))}
  </div>
);

export default function PerformancePage() {
  const t = useTranslations();
  const params = useParams();
  const locale = params.locale as string;

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
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
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
    <div className="animate-fade-in">
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
        <TableSkeleton rows={5} columns={5} />
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <AlertCircle className="size-12 mb-4 text-muted-foreground/40" />
          <p className="text-muted-foreground">{t('performance.noReviews')}</p>
        </div>
      ) : (
        <>
          <Card className="shadow-premium overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/30">
                    <th className="px-6 py-3.5 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('performance.employeePerformance')}
                    </th>
                    <th className="px-6 py-3.5 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('performance.period')}
                    </th>
                    <th className="px-6 py-3.5 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('performance.overallRating')}
                    </th>
                    <th className="px-6 py-3.5 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('performance.tasksCompleted')}
                    </th>
                    <th className="px-6 py-3.5 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('performance.onTimeRate')}
                    </th>
                    <th className="px-6 py-3.5 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('common.status')}
                    </th>
                    <th className="px-6 py-3.5 text-end text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('common.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {reviews.map((review) => (
                    <tr key={review.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <Link
                            href={`/${locale}/performance/${review.user.id}`}
                            className="text-sm font-medium text-primary hover:underline"
                          >
                            {review.user.fullName}
                          </Link>
                          {review.user.jobTitle && (
                            <p className="text-xs text-muted-foreground mt-0.5">{review.user.jobTitle}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <Badge variant="outline" className="mb-1">
                            {t(`performance.${review.period.toLowerCase()}`)}
                          </Badge>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(review.periodStart)} - {formatDate(review.periodEnd)}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StarDisplay rating={review.overallRating} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {review.tasksCompleted}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${getOnTimePercentage(review) >= 80 ? 'text-success' : getOnTimePercentage(review) >= 50 ? 'text-warning' : 'text-destructive'}`}>
                          {getOnTimePercentage(review)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={`${STATUS_CONFIG[review.status]?.bg} ${STATUS_CONFIG[review.status]?.color} border`}
                        >
                          {t(`performance.status${review.status.charAt(0) + review.status.slice(1).toLowerCase()}`)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-end">
                        <Link href={`/${locale}/performance/${review.user.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="size-4" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t('common.showing')} {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} {t('common.of')} {pagination.total} {t('common.results')}
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  variant="outline"
                  size="sm"
                >
                  <ChevronLeft className="size-4 rtl:-scale-x-100" />
                  {t('common.previous')}
                </Button>
                <Button
                  onClick={() => setPage(page + 1)}
                  disabled={page === pagination.totalPages}
                  variant="outline"
                  size="sm"
                >
                  {t('common.next')}
                  <ChevronRight className="size-4 rtl:-scale-x-100" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
