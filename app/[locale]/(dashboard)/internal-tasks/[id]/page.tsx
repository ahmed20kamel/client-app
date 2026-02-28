'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  User,
  Calendar,
  Clock,
  CheckCircle2,
  MessageSquare,
  Send,
  Building2,
  Tag,
  Star,
  Play,
  Upload,
  ThumbsUp,
  ThumbsDown,
  XCircle,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface TaskComment {
  id: string;
  content: string;
  type: 'COMMENT' | 'STATUS_CHANGE' | 'SUBMISSION' | 'APPROVAL' | 'REJECTION' | 'SYSTEM';
  createdAt: string;
  user: {
    id: string;
    fullName: string;
  };
}

interface TaskRating {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  ratedBy: {
    id: string;
    fullName: string;
  };
}

interface InternalTask {
  id: string;
  title: string;
  description: string | null;
  status: 'OPEN' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueAt: string | null;
  createdAt: string;
  submittedAt: string | null;
  approvedAt: string | null;
  completedAt: string | null;
  rejectionReason: string | null;
  assignedTo: {
    id: string;
    fullName: string;
  };
  createdBy: {
    id: string;
    fullName: string;
  };
  approvedBy: {
    id: string;
    fullName: string;
  } | null;
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
  rating: TaskRating | null;
  comments: TaskComment[];
  _count: {
    comments: number;
  };
}

interface Session {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

// ─── Badge Config ────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  OPEN: 'bg-gray-50 border-gray-200 text-gray-700',
  IN_PROGRESS: 'bg-blue-50 border-blue-200 text-blue-700',
  SUBMITTED: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  APPROVED: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  REJECTED: 'bg-red-50 border-red-200 text-red-700',
  DONE: 'bg-emerald-50 border-emerald-200 text-emerald-700',
};

const PRIORITY_BADGE: Record<string, string> = {
  LOW: 'bg-gray-50 border-gray-200 text-gray-700',
  MEDIUM: 'bg-gray-100 border-gray-300 text-gray-800',
  HIGH: 'bg-orange-50 border-orange-200 text-orange-700',
  URGENT: 'bg-red-50 border-red-200 text-red-700',
};

// ─── Star Rating Component ──────────────────────────────────────────────────

const StarRating = ({ value, onChange, readOnly = false }: { value: number; onChange?: (v: number) => void; readOnly?: boolean }) => {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          className={`${readOnly ? 'cursor-default' : 'cursor-pointer'} transition-colors`}
          onMouseEnter={() => !readOnly && setHover(star)}
          onMouseLeave={() => !readOnly && setHover(0)}
          onClick={() => onChange?.(star)}
        >
          <Star
            className={`size-6 ${(hover || value) >= star ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`}
          />
        </button>
      ))}
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────

export default function InternalTaskDetailPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const id = params.id as string;

  const [task, setTask] = useState<InternalTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  // Action states
  const [isActioning, setIsActioning] = useState(false);

  // Reject state
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Rating state
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [isRating, setIsRating] = useState(false);

  // Comment state
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Fetch session
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const data = await res.json();
          if (data?.user) {
            setSession(data);
          }
        }
      } catch (error) {
        console.error('Error fetching session:', error);
      }
    };
    fetchSession();
  }, []);

  const fetchTask = async () => {
    try {
      const response = await fetch(`/api/internal-tasks/${id}`);
      if (!response.ok) {
        if (response.status === 403) {
          toast.error(t('messages.unauthorized'));
          router.push(`/${locale}/internal-tasks`);
          return;
        }
        if (response.status === 404) {
          toast.error(t('messages.notFound', { entity: t('internalTasks.title') }));
          router.push(`/${locale}/internal-tasks`);
          return;
        }
        throw new Error('Failed to fetch task');
      }
      const { data } = await response.json();
      setTask(data);
    } catch (error) {
      toast.error(t('common.error'));
      router.push(`/${locale}/internal-tasks`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTask();
  }, [id]);

  // ─── Action Handlers ────────────────────────────────────────────────────

  const handleStartWorking = async () => {
    setIsActioning(true);
    try {
      const response = await fetch(`/api/internal-tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || t('common.error'));
        return;
      }

      toast.success(t('messages.updateSuccess', { entity: t('internalTasks.title') }));
      fetchTask();
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setIsActioning(false);
    }
  };

  const handleSubmitForApproval = async () => {
    setIsActioning(true);
    try {
      const response = await fetch(`/api/internal-tasks/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || t('common.error'));
        return;
      }

      toast.success(t('messages.submitSuccess'));
      fetchTask();
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setIsActioning(false);
    }
  };

  const handleApprove = async () => {
    setIsActioning(true);
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
      fetchTask();
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setIsActioning(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) return;
    setIsActioning(true);
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
      setShowRejectForm(false);
      setRejectionReason('');
      fetchTask();
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setIsActioning(false);
    }
  };

  const handleRate = async () => {
    if (ratingValue === 0) return;
    setIsRating(true);
    try {
      const response = await fetch(`/api/internal-tasks/${id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: ratingValue,
          comment: ratingComment || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || t('common.error'));
        return;
      }

      toast.success(t('messages.ratingSuccess'));
      setRatingValue(0);
      setRatingComment('');
      fetchTask();
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setIsRating(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setIsSubmittingComment(true);
    try {
      const response = await fetch(`/api/internal-tasks/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment }),
      });

      if (!response.ok) throw new Error('Failed to add comment');

      toast.success(t('messages.commentAdded'));
      setNewComment('');
      fetchTask();
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString(locale === 'ar' ? 'ar-AE' : 'en-AE');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'ar' ? 'ar-AE' : 'en-AE');
  };

  const getStatusLabel = (s: string) => {
    const map: Record<string, string> = {
      OPEN: t('internalTasks.statusOpen'),
      IN_PROGRESS: t('internalTasks.statusInProgress'),
      SUBMITTED: t('internalTasks.statusSubmitted'),
      APPROVED: t('internalTasks.statusApproved'),
      REJECTED: t('internalTasks.statusRejected'),
      DONE: t('internalTasks.statusDone'),
    };
    return map[s] || s;
  };

  const getPriorityLabel = (p: string) => {
    const map: Record<string, string> = {
      LOW: t('internalTasks.priorityLow'),
      MEDIUM: t('internalTasks.priorityMedium'),
      HIGH: t('internalTasks.priorityHigh'),
      URGENT: t('internalTasks.priorityUrgent'),
    };
    return map[p] || p;
  };

  const getCommentIcon = (type: string) => {
    switch (type) {
      case 'STATUS_CHANGE': return <CheckCircle2 className="size-4 text-purple-500" />;
      case 'SUBMISSION': return <Upload className="size-4 text-blue-500" />;
      case 'APPROVAL': return <ThumbsUp className="size-4 text-emerald-500" />;
      case 'REJECTION': return <XCircle className="size-4 text-red-500" />;
      case 'SYSTEM': return <AlertCircle className="size-4 text-gray-500" />;
      default: return <MessageSquare className="size-4 text-blue-500" />;
    }
  };

  const getRatingLabel = (rating: number) => {
    const labels: Record<number, string> = {
      1: t('rating.poor'),
      2: t('rating.belowAverage'),
      3: t('rating.average'),
      4: t('rating.good'),
      5: t('rating.excellent'),
    };
    return labels[rating] || '';
  };

  // ─── Determine which actions to show ─────────────────────────────────────

  const currentUserId = session?.user?.id;
  const isAssignee = task ? currentUserId === task.assignedTo.id : false;
  const isCreator = task ? currentUserId === task.createdBy.id : false;

  // ─── Loading / Not Found ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-muted-foreground mt-3">{t('common.loading')}</p>
      </div>
    );
  }

  if (!task) {
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
          <Button variant="ghost" size="sm" onClick={() => router.push(`/${locale}/internal-tasks`)}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{task.title}</h1>
            {task.department && (
              <p className="text-muted-foreground mt-0.5 flex items-center gap-1">
                <Building2 className="size-3.5" />
                {locale === 'ar' && task.department.nameAr ? task.department.nameAr : task.department.name}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          {/* Assignee: Start Working */}
          {task.status === 'OPEN' && isAssignee && (
            <Button
              className="btn-premium"
              onClick={handleStartWorking}
              disabled={isActioning}
            >
              {isActioning ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              {t('internalTasks.startWorking')}
            </Button>
          )}

          {/* Assignee: Submit for Approval */}
          {task.status === 'IN_PROGRESS' && isAssignee && (
            <Button
              className="btn-premium"
              onClick={handleSubmitForApproval}
              disabled={isActioning}
            >
              {isActioning ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {t('internalTasks.submitForApproval')}
            </Button>
          )}

          {/* Assignee: Resubmit */}
          {task.status === 'REJECTED' && isAssignee && (
            <Button
              className="btn-premium"
              onClick={handleSubmitForApproval}
              disabled={isActioning}
            >
              {isActioning ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
              {t('internalTasks.resubmit')}
            </Button>
          )}

          {/* Creator: Approve & Reject */}
          {task.status === 'SUBMITTED' && isCreator && (
            <>
              <Button
                onClick={handleApprove}
                disabled={isActioning}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isActioning ? <Loader2 className="size-4 animate-spin" /> : <ThumbsUp className="size-4" />}
                {t('internalTasks.approve')}
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowRejectForm(!showRejectForm)}
                disabled={isActioning}
              >
                <ThumbsDown className="size-4" />
                {t('internalTasks.reject')}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Reject Form Panel */}
      {showRejectForm && (
        <Card className="shadow-premium mb-6 border-red-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-red-600">
              <ThumbsDown className="size-4" />
              {t('internalTasks.reject')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              placeholder={t('internalTasks.rejectionReasonPlaceholder')}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={handleReject}
                disabled={!rejectionReason.trim() || isActioning}
              >
                {isActioning ? <Loader2 className="size-4 animate-spin" /> : t('internalTasks.reject')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowRejectForm(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Task Details Card */}
          <Card className="shadow-premium">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t('common.status')}</p>
                  <Badge variant="outline" className={`${STATUS_BADGE[task.status]} border`}>
                    {getStatusLabel(task.status)}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t('internalTasks.priority')}</p>
                  <Badge variant="outline" className={`${PRIORITY_BADGE[task.priority]} border`}>
                    {getPriorityLabel(task.priority)}
                  </Badge>
                </div>
                {task.dueAt && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t('internalTasks.dueDate')}</p>
                    <p className="font-medium flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-muted-foreground" />
                      {formatDate(task.dueAt)}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t('common.createdAt')}</p>
                  <p className="font-medium">{formatDate(task.createdAt)}</p>
                </div>
              </div>

              {task.description && (
                <div className="mt-6 pt-6 border-t border-border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{t('internalTasks.description')}</p>
                  <p className="text-foreground whitespace-pre-wrap">{task.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rejection Reason Alert */}
          {task.status === 'REJECTED' && task.rejectionReason && (
            <Card className="shadow-premium border-red-200 bg-red-50/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="size-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-700 mb-1">{t('internalTasks.rejectionReason')}</p>
                    <p className="text-sm text-red-600">{task.rejectionReason}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Existing Rating Display */}
          {task.rating && (
            <Card className="shadow-premium">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="size-4 text-yellow-500" />
                  {t('rating.rateTask')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-2">
                  <StarRating value={task.rating.rating} readOnly />
                  <span className="text-sm font-medium">
                    {task.rating.rating}/5 - {getRatingLabel(task.rating.rating)}
                  </span>
                </div>
                {task.rating.comment && (
                  <p className="text-sm text-muted-foreground mt-2">{task.rating.comment}</p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  {t('internalTasks.approvedBy', { name: task.rating.ratedBy.fullName })} - {formatDateTime(task.rating.createdAt)}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Rate Panel - only for creator on APPROVED/DONE without existing rating */}
          {(task.status === 'APPROVED' || task.status === 'DONE') && isCreator && !task.rating && (
            <Card className="shadow-premium border-yellow-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="size-4 text-yellow-500" />
                  {t('rating.rateTask')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">{t('rating.stars')}</p>
                  <div className="flex items-center gap-3">
                    <StarRating value={ratingValue} onChange={setRatingValue} />
                    {ratingValue > 0 && (
                      <span className="text-sm text-muted-foreground">{getRatingLabel(ratingValue)}</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">{t('rating.comment')}</p>
                  <textarea
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                    rows={3}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                    placeholder={t('rating.commentPlaceholder')}
                  />
                </div>
                <Button
                  onClick={handleRate}
                  disabled={ratingValue === 0 || isRating}
                  className="btn-premium"
                >
                  {isRating ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Star className="size-4" />
                  )}
                  {t('rating.submitRating')}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Comments / Activity Log */}
          <Card className="shadow-premium">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="size-4" />
                {t('internalTasks.activityLog')} ({task._count.comments})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Add Comment */}
              <div className="flex gap-2 mb-6">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={2}
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                  placeholder={t('internalTasks.writeComment')}
                  disabled={isSubmittingComment}
                />
                <Button
                  size="sm"
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || isSubmittingComment}
                  className="self-end"
                >
                  {isSubmittingComment ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                </Button>
              </div>

              {/* Comments List */}
              {task.comments.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="size-8 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {task.comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="shrink-0 mt-0.5">
                        {getCommentIcon(comment.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium">{comment.user.fullName}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(comment.createdAt)}
                          </span>
                          {comment.type !== 'COMMENT' && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {comment.type.replace(/_/g, ' ')}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-foreground/80">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - 1/3 */}
        <div className="space-y-6">
          {/* Assignee Card */}
          <Card className="shadow-premium">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="size-4" />
                {t('internalTasks.assignee')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{task.assignedTo.fullName}</p>
            </CardContent>
          </Card>

          {/* Creator Card */}
          <Card className="shadow-premium">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="size-4" />
                {t('internalTasks.creator')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{task.createdBy.fullName}</p>
            </CardContent>
          </Card>

          {/* Department Card */}
          {task.department && (
            <Card className="shadow-premium">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building2 className="size-4" />
                  {t('internalTasks.department')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">
                  {locale === 'ar' && task.department.nameAr ? task.department.nameAr : task.department.name}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Category Card */}
          {task.category && (
            <Card className="shadow-premium">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Tag className="size-4" />
                  {t('internalTasks.category')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span
                  className="inline-flex items-center gap-1 text-sm font-medium px-2 py-0.5 rounded-full border"
                  style={{
                    borderColor: task.category.color + '40',
                    backgroundColor: task.category.color + '10',
                    color: task.category.color,
                  }}
                >
                  <Tag className="size-3" />
                  {locale === 'ar' && task.category.nameAr ? task.category.nameAr : task.category.name}
                </span>
              </CardContent>
            </Card>
          )}

          {/* Dates Card */}
          <Card className="shadow-premium">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="size-4" />
                {t('common.date')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{t('common.createdAt')}</p>
                <p className="text-sm font-medium">{formatDateTime(task.createdAt)}</p>
              </div>
              {task.dueAt && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{t('internalTasks.dueDate')}</p>
                  <p className="text-sm font-medium">{formatDate(task.dueAt)}</p>
                </div>
              )}
              {task.submittedAt && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{t('internalTasks.submittedAt')}</p>
                  <p className="text-sm font-medium">{formatDateTime(task.submittedAt)}</p>
                </div>
              )}
              {task.approvedAt && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{t('internalTasks.approvedAt')}</p>
                  <p className="text-sm font-medium">{formatDateTime(task.approvedAt)}</p>
                </div>
              )}
              {task.completedAt && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{t('internalTasks.completedAt')}</p>
                  <p className="text-sm font-medium">{formatDateTime(task.completedAt)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
