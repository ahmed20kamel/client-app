'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Save,
  Loader2,
  Star,
  User,
  Calendar,
  FileText,
  TrendingUp,
  Award,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';

interface UserOption {
  id: string;
  fullName: string;
  jobTitle: string | null;
}

const StarRating = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className="cursor-pointer transition-colors"
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
        >
          <Star
            className={`size-8 ${
              (hover || value) >= star
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-muted-foreground/30'
            }`}
          />
        </button>
      ))}
    </div>
  );
};

export default function CreatePerformanceReviewPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);

  // Form state
  const [userId, setUserId] = useState('');
  const [period, setPeriod] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [overallRating, setOverallRating] = useState(0);
  const [strengths, setStrengths] = useState('');
  const [improvements, setImprovements] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users?limit=1000');
        if (response.ok) {
          const data = await response.json();
          setUsers(data.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };
    fetchUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId || !period || !periodStart || !periodEnd || overallRating === 0) {
      toast.error(t('validation.required'));
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          period,
          periodStart,
          periodEnd,
          overallRating,
          strengths: strengths || null,
          improvements: improvements || null,
          notes: notes || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || t('common.error'));
        return;
      }

      toast.success(t('messages.reviewCreated'));
      router.push(`/${locale}/performance`);
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      {/* Header */}
      <PageHeader
        icon={Award}
        title={t('performance.createReview')}
        subtitle={t('performance.subtitle')}
        actions={
          <Button variant="outline" onClick={() => router.push(`/${locale}/performance`)}>
            <ArrowLeft className="size-4 me-2 rtl:-scale-x-100" />
            {t('common.back')}
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Employee & Period */}
        <Card className="shadow-premium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="size-5 text-primary" />
              {t('performance.employeePerformance')}
            </CardTitle>
            <CardDescription>
              {t('performance.selectEmployee')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Employee Select */}
            <div>
              <Label>{t('performance.selectEmployee')} *</Label>
              <Select value={userId} onValueChange={setUserId} disabled={isLoading}>
                <SelectTrigger className="w-full mt-1">
                  <div className="flex items-center gap-2">
                    <User className="size-4 text-muted-foreground" />
                    <SelectValue placeholder={t('performance.selectEmployee')} />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.fullName}
                      {user.jobTitle && ` - ${user.jobTitle}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Period Type */}
            <div>
              <Label>{t('performance.period')} *</Label>
              <Select value={period} onValueChange={setPeriod} disabled={isLoading}>
                <SelectTrigger className="w-full mt-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4 text-muted-foreground" />
                    <SelectValue placeholder={t('performance.period')} />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">{t('performance.monthly')}</SelectItem>
                  <SelectItem value="QUARTERLY">{t('performance.quarterly')}</SelectItem>
                  <SelectItem value="ANNUAL">{t('performance.annual')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Period Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{t('performance.periodStart')} *</Label>
                <div className="relative mt-1">
                  <Calendar className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    disabled={isLoading}
                    className="ps-10"
                  />
                </div>
              </div>
              <div>
                <Label>{t('performance.periodEnd')} *</Label>
                <div className="relative mt-1">
                  <Calendar className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    disabled={isLoading}
                    className="ps-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rating */}
        <Card className="shadow-premium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="size-5 text-primary" />
              {t('performance.overallRating')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StarRating value={overallRating} onChange={setOverallRating} />
            {overallRating > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                {overallRating} {t('rating.outOf')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Feedback */}
        <Card className="shadow-premium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-5 text-primary" />
              {t('performance.strengths')} {locale === 'ar' ? 'و' : '&'} {t('performance.improvements')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Strengths */}
            <div>
              <Label>{t('performance.strengths')}</Label>
              <textarea
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                placeholder={t('performance.strengthsPlaceholder')}
                rows={4}
                disabled={isLoading}
                className="mt-1 w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
            </div>

            {/* Areas for Improvement */}
            <div>
              <Label>{t('performance.improvements')}</Label>
              <textarea
                value={improvements}
                onChange={(e) => setImprovements(e.target.value)}
                placeholder={t('performance.improvementsPlaceholder')}
                rows={4}
                disabled={isLoading}
                className="mt-1 w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
            </div>

            {/* Additional Notes */}
            <div>
              <Label>{t('performance.notes')}</Label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('performance.notesPlaceholder')}
                rows={3}
                disabled={isLoading}
                className="mt-1 w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/${locale}/performance`)}
            disabled={isLoading}
          >
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={isLoading} className="min-w-[140px] btn-premium">
            {isLoading ? (
              <>
                <Loader2 className="size-4 me-2 animate-spin" />
                {t('common.loading')}
              </>
            ) : (
              <>
                <Save className="size-4 me-2" />
                {t('common.create')}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
