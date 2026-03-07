'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Clock,
  User,
  Eye,
  ShieldCheck,
} from 'lucide-react';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { PageHeader } from '@/components/PageHeader';

interface InternalTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueAt: string | null;
  createdAt: string;
  submittedAt: string | null;
  assignedTo: {
    id: string;
    fullName: string;
  };
  createdBy: {
    id: string;
    fullName: string;
  };
  department: {
    id: string;
    name: string;
    nameAr: string | null;
  } | null;
  category: {
    id: string;
    name: string;
    nameAr: string | null;
    color: string;
  } | null;
  _count: {
    comments: number;
  };
}

const PRIORITY_CONFIG: Record<string, { color: string; bg: string }> = {
  LOW: { color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' },
  MEDIUM: { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  HIGH: { color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  URGENT: { color: 'text-red-700', bg: 'bg-red-100 border-red-300' },
};

export default function ApprovalsPage() {
  const t = useTranslations();
  const params = useParams();
  const locale = params.locale as string;

  const [tasks, setTasks] = useState<InternalTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/internal-tasks?status=SUBMITTED');
      if (!response.ok) {
        if (response.status === 403) {
          toast.error(t('messages.unauthorized'));
          return;
        }
        throw new Error('Failed to fetch tasks');
      }
      const data = await response.json();
      setTasks(data.data);
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    setApprovingId(id);
    try {
      const response = await fetch(`/api/internal-tasks/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || t('common.error'));
        return;
      }

      toast.success(t('messages.approveSuccess'));
      setTasks((prev) => prev.filter((task) => task.id !== id));
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setProcessingId(null);
      setApprovingId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectionReason.trim()) return;
    setProcessingId(id);
    try {
      const response = await fetch(`/api/internal-tasks/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectionReason }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || t('common.error'));
        return;
      }

      toast.success(t('messages.rejectSuccess'));
      setTasks((prev) => prev.filter((task) => task.id !== id));
      setRejectingId(null);
      setRejectionReason('');
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'ar' ? 'ar-AE' : 'en-AE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <PageHeader
        title={t('approvals.title')}
        icon={ShieldCheck}
        subtitle={t('approvals.subtitle')}
        actions={
          tasks.length > 0 ? (
            <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-700 px-3 py-1 text-sm">
              {t('approvals.pendingCount', { count: tasks.length })}
            </Badge>
          ) : undefined
        }
      />

      {/* Content */}
      {loading ? (
        <TableSkeleton rows={4} columns={5} />
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <AlertCircle className="size-12 mb-4 text-muted-foreground/40" />
          <p className="text-muted-foreground">{t('approvals.noApprovals')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <Card key={task.id} className="shadow-premium">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Task Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <Link
                          href={`/${locale}/internal-tasks/${task.id}`}
                          className="text-lg font-semibold text-primary hover:underline"
                        >
                          {task.title}
                        </Link>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 mt-3">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <User className="size-3.5" />
                            <span>{task.assignedTo.fullName}</span>
                          </div>
                          <Badge
                            variant="outline"
                            className={`${PRIORITY_CONFIG[task.priority]?.bg} ${PRIORITY_CONFIG[task.priority]?.color} border`}
                          >
                            {t(`internalTasks.priority${task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}`)}
                          </Badge>
                          {task.category && (
                            <span
                              className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full border"
                              style={{
                                borderColor: task.category.color + '40',
                                backgroundColor: task.category.color + '10',
                                color: task.category.color,
                              }}
                            >
                              {locale === 'ar' && task.category.nameAr ? task.category.nameAr : task.category.name}
                            </span>
                          )}
                          {task.department && (
                            <span className="text-xs text-muted-foreground">
                              {locale === 'ar' && task.department.nameAr ? task.department.nameAr : task.department.name}
                            </span>
                          )}
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="size-3" />
                            {task.submittedAt
                              ? formatDate(task.submittedAt)
                              : formatDate(task.createdAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Link href={`/${locale}/internal-tasks/${task.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="size-4" />
                        {t('common.view')}
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      className="bg-success hover:bg-success/90 text-white"
                      onClick={() => handleApprove(task.id)}
                      disabled={processingId === task.id}
                    >
                      {approvingId === task.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-4" />
                      )}
                      {t('approvals.quickApprove')}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (rejectingId === task.id) {
                          setRejectingId(null);
                          setRejectionReason('');
                        } else {
                          setRejectingId(task.id);
                          setRejectionReason('');
                        }
                      }}
                      disabled={processingId === task.id}
                    >
                      <XCircle className="size-4" />
                      {t('approvals.quickReject')}
                    </Button>
                  </div>
                </div>

                {/* Rejection Reason Inline */}
                {rejectingId === task.id && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <label className="text-sm font-medium mb-2 block">
                      {t('internalTasks.rejectionReason')}
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder={t('internalTasks.rejectionReasonPlaceholder')}
                      rows={3}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    />
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(task.id)}
                        disabled={!rejectionReason.trim() || processingId === task.id}
                      >
                        {processingId === task.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <XCircle className="size-4" />
                        )}
                        {t('internalTasks.reject')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setRejectingId(null);
                          setRejectionReason('');
                        }}
                      >
                        {t('common.cancel')}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
