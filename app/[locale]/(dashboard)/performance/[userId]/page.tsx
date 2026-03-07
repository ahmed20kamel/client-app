'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  ArrowLeft,
  AlertCircle,
  Star,
  ClipboardCheck,
  Clock,
  TrendingUp,
  BarChart3,
  User,
} from 'lucide-react';
import { PageSkeleton, DetailSkeleton } from '@/components/ui/page-skeleton';

interface UserData {
  id: string;
  fullName: string;
  email: string;
  jobTitle: string | null;
}

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
  user: UserData;
  reviewer: {
    id: string;
    fullName: string;
  };
}

interface RecentRating {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  internalTask: {
    title: string;
  };
}

interface Stats {
  totalTasks: number;
  completedTasks: number;
  onTimeTasks: number;
  averageRating: number;
  totalReviews: number;
}

interface PerformanceData {
  user: UserData;
  reviews: PerformanceReview[];
  stats: Stats;
  recentRatings: RecentRating[];
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

export default function EmployeePerformancePage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const userId = params.userId as string;

  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/performance/user/${userId}`);
        if (!response.ok) {
          if (response.status === 404) {
            toast.error(t('messages.notFound', { entity: t('users.title') }));
            router.push(`/${locale}/performance`);
            return;
          }
          throw new Error('Failed to fetch performance data');
        }
        const result = await response.json();
        setData(result.data);
      } catch (error) {
        toast.error(t('common.error'));
        router.push(`/${locale}/performance`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'ar' ? 'ar-AE' : 'en-AE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getOnTimeRate = () => {
    if (!data || data.stats.completedTasks === 0) return 0;
    return Math.round((data.stats.onTimeTasks / data.stats.completedTasks) * 100);
  };

  if (loading) {
    return <DetailSkeleton />;
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
        <AlertCircle className="size-12 mb-4 text-muted-foreground/40" />
        <p className="text-muted-foreground">{t('common.noData')}</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 lg:mb-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/${locale}/performance`)}>
            <ArrowLeft className="size-4 rtl:-scale-x-100" />
          </Button>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{data.user.fullName}</h1>
            {data.user.jobTitle && (
              <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5">
                <User className="size-3.5" />
                {data.user.jobTitle}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 lg:mb-8">
        <Card className="shadow-premium">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-50">
                <ClipboardCheck className="size-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  {t('performance.totalTasks')}
                </p>
                <p className="text-2xl font-bold">{data.stats.totalTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-premium">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-50">
                <TrendingUp className="size-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  {t('performance.tasksCompleted')}
                </p>
                <p className="text-2xl font-bold">{data.stats.completedTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-premium">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-50">
                <Clock className="size-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  {t('performance.onTimeRate')}
                </p>
                <p className="text-2xl font-bold">{getOnTimeRate()}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-premium">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-yellow-50">
                <Star className="size-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  {t('rating.averageRating')}
                </p>
                <p className="text-2xl font-bold">
                  {data.stats.averageRating > 0 ? data.stats.averageRating.toFixed(1) : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Review History */}
      <Card className="shadow-premium mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="size-5 text-primary" />
            {t('performance.reviewHistory')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.reviews.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="size-8 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">{t('performance.noReviews')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/30">
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
                      {t('performance.reviewer')}
                    </th>
                    <th className="px-6 py-3.5 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('common.status')}
                    </th>
                    <th className="px-6 py-3.5 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('common.date')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.reviews.map((review) => (
                    <tr key={review.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="outline">
                          {t(`performance.${review.period.toLowerCase()}`)}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(review.periodStart)} - {formatDate(review.periodEnd)}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StarDisplay rating={review.overallRating} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {review.tasksCompleted}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {review.reviewer.fullName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={`${STATUS_CONFIG[review.status]?.bg} ${STATUS_CONFIG[review.status]?.color} border`}
                        >
                          {t(`performance.status${review.status.charAt(0) + review.status.slice(1).toLowerCase()}`)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(review.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Ratings */}
      <Card className="shadow-premium">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="size-5 text-primary" />
            {t('performance.recentRatings')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentRatings.length === 0 ? (
            <div className="text-center py-8">
              <Star className="size-8 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">{t('rating.noRating')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.recentRatings.map((rating) => (
                <div
                  key={rating.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/20 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{rating.internalTask.title}</p>
                    {rating.comment && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{rating.comment}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 shrink-0 ms-4">
                    <StarDisplay rating={rating.rating} />
                    <span className="text-xs text-muted-foreground">{formatDate(rating.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
