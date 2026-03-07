'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateTaskSchema, UpdateTaskInput } from '@/lib/validations/task';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Pencil,
  Loader2,
  AlertCircle,
  User,
  Phone,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Send,
  Users,
  ArrowUpCircle,
  Building2,
  Tag,
} from 'lucide-react';
import { PageSkeleton, DetailSkeleton } from '@/components/ui/page-skeleton';

interface TaskComment {
  id: string;
  content: string;
  type: string;
  metadata: string | null;
  createdAt: string;
  user: {
    id: string;
    fullName: string;
  };
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'OPEN' | 'DONE' | 'OVERDUE' | 'CANCELED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  escalationLevel: number;
  dueAt: string;
  slaDeadline: string | null;
  completedAt: string | null;
  createdAt: string;
  customer: {
    id: string;
    fullName: string;
    phone: string;
  };
  assignedTo: {
    id: string;
    fullName: string;
    email: string;
  };
  createdBy: {
    id: string;
    fullName: string;
  };
  category: {
    id: string;
    name: string;
    nameAr: string | null;
    color: string;
    icon: string | null;
  } | null;
  department: {
    id: string;
    name: string;
    nameAr: string | null;
  } | null;
  comments: TaskComment[];
  _count: {
    comments: number;
  };
}

interface UserOption {
  id: string;
  fullName: string;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  OPEN: { color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  DONE: { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  OVERDUE: { color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  CANCELED: { color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' },
};

const PRIORITY_CONFIG: Record<string, { color: string; bg: string }> = {
  LOW: { color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' },
  MEDIUM: { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  HIGH: { color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
};

const COMMENT_TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  COMMENT: { icon: 'message', color: 'text-blue-500' },
  STATUS_CHANGE: { icon: 'status', color: 'text-purple-500' },
  REASSIGNMENT: { icon: 'reassign', color: 'text-amber-500' },
  ESCALATION: { icon: 'escalation', color: 'text-red-500' },
  SYSTEM: { icon: 'system', color: 'text-gray-500' },
};

export default function TaskDetailsPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const id = params.id as string;

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Comment state
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Reassign state
  const [showReassign, setShowReassign] = useState(false);
  const [reassignUserId, setReassignUserId] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [isReassigning, setIsReassigning] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);

  // Escalation state
  const [showEscalate, setShowEscalate] = useState(false);
  const [escalationLevel, setEscalationLevel] = useState('1');
  const [escalationReason, setEscalationReason] = useState('');
  const [isEscalating, setIsEscalating] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateTaskInput>({
    resolver: zodResolver(updateTaskSchema),
  });

  const fetchTask = async () => {
    try {
      const response = await fetch(`/api/tasks/${id}`);
      if (!response.ok) {
        if (response.status === 403) {
          toast.error(t('messages.unauthorized'));
          router.push(`/${locale}/tasks`);
          return;
        }
        throw new Error('Failed to fetch task');
      }
      const { data } = await response.json();
      setTask(data);

      const dueDate = new Date(data.dueAt);
      reset({
        title: data.title,
        description: data.description || '',
        dueAt: dueDate.toISOString().slice(0, 16),
        priority: data.priority,
        status: data.status,
      });
    } catch (error) {
      toast.error(t('common.error'));
      router.push(`/${locale}/tasks`);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    fetchTask();
    fetchUsers();
  }, [id]);

  const onSubmit = async (data: UpdateTaskInput) => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || t('common.error'));
        return;
      }

      toast.success(t('messages.updateSuccess', { entity: t('tasks.title') }));
      setIsEditing(false);
      fetchTask();
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setIsSubmittingComment(true);
    try {
      const response = await fetch(`/api/tasks/${id}/comments`, {
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

  const handleReassign = async () => {
    if (!reassignUserId) return;
    setIsReassigning(true);
    try {
      const response = await fetch(`/api/tasks/${id}/reassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedToId: reassignUserId, reason: reassignReason }),
      });

      if (!response.ok) throw new Error('Failed to reassign task');

      toast.success(t('messages.reassignSuccess'));
      setShowReassign(false);
      setReassignUserId('');
      setReassignReason('');
      fetchTask();
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setIsReassigning(false);
    }
  };

  const handleEscalate = async () => {
    if (!escalationReason.trim()) return;
    setIsEscalating(true);
    try {
      const response = await fetch(`/api/tasks/${id}/escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          escalationLevel: parseInt(escalationLevel),
          reason: escalationReason,
        }),
      });

      if (!response.ok) throw new Error('Failed to escalate task');

      toast.success(t('messages.escalationSuccess'));
      setShowEscalate(false);
      setEscalationReason('');
      fetchTask();
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setIsEscalating(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString(locale === 'ar' ? 'ar-AE' : 'en-AE');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'ar' ? 'ar-AE' : 'en-AE');
  };

  const getCommentIcon = (type: string) => {
    switch (type) {
      case 'STATUS_CHANGE': return <CheckCircle2 className="size-4 text-purple-500" />;
      case 'REASSIGNMENT': return <Users className="size-4 text-amber-500" />;
      case 'ESCALATION': return <AlertTriangle className="size-4 text-red-500" />;
      case 'SYSTEM': return <AlertCircle className="size-4 text-gray-500" />;
      default: return <MessageSquare className="size-4 text-blue-500" />;
    }
  };

  if (loading) {
    return <DetailSkeleton />;
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
        <AlertCircle className="size-12 mb-4 text-muted-foreground/40" />
        <p className="text-muted-foreground">{t('common.noData')}</p>
      </div>
    );
  }

  const escalationLabels = [t('tasks.levelNormal'), t('tasks.levelEscalated'), t('tasks.levelCritical')];

  return (
    <div className="animate-fade-in max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 lg:mb-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/${locale}/tasks`)}>
            <ArrowLeft className="size-4 rtl:-scale-x-100" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{task.title}</h1>
              {task.escalationLevel > 0 && (
                <Badge variant="outline" className={`${task.escalationLevel === 2 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700'} border`}>
                  <AlertTriangle className="size-3 me-1" />
                  {escalationLabels[task.escalationLevel]}
                </Badge>
              )}
            </div>
            {task.department && (
              <p className="text-muted-foreground mt-0.5 flex items-center gap-1">
                <Building2 className="size-3.5" />
                {locale === 'ar' && task.department.nameAr ? task.department.nameAr : task.department.name}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {!isEditing && (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Pencil className="size-4" />
                {t('common.edit')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowReassign(!showReassign)}>
                <Users className="size-4" />
                {t('tasks.reassign')}
              </Button>
              {task.escalationLevel < 2 && (
                <Button variant="outline" size="sm" onClick={() => setShowEscalate(!showEscalate)} className="text-warning hover:text-warning/80 border-warning/30 hover:bg-warning/10">
                  <ArrowUpCircle className="size-4" />
                  {t('tasks.escalate')}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Reassign Panel */}
      {showReassign && (
        <Card className="shadow-premium mb-6 border-amber-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="size-4" />
              {t('tasks.reassignTo')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={reassignUserId} onValueChange={setReassignUserId}>
              <SelectTrigger>
                <SelectValue placeholder={t('tasks.reassignTo')} />
              </SelectTrigger>
              <SelectContent>
                {users.filter(u => u.id !== task.assignedTo.id).map((user) => (
                  <SelectItem key={user.id} value={user.id}>{user.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder={t('tasks.reassign') + ' - ' + t('common.description') + ' (' + t('common.description') + ')'}
              value={reassignReason}
              onChange={(e) => setReassignReason(e.target.value)}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleReassign} disabled={!reassignUserId || isReassigning}>
                {isReassigning ? <Loader2 className="size-4 animate-spin" /> : t('common.submit')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowReassign(false)}>{t('common.cancel')}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Escalate Panel */}
      {showEscalate && (
        <Card className="shadow-premium mb-6 border-red-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowUpCircle className="size-4 text-red-500" />
              {t('tasks.escalate')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={escalationLevel} onValueChange={setEscalationLevel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">{t('tasks.levelEscalated')}</SelectItem>
                <SelectItem value="2">{t('tasks.levelCritical')}</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder={t('tasks.escalate') + ' - ' + t('common.description')}
              value={escalationReason}
              onChange={(e) => setEscalationReason(e.target.value)}
            />
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={handleEscalate} disabled={!escalationReason.trim() || isEscalating}>
                {isEscalating ? <Loader2 className="size-4 animate-spin" /> : t('tasks.escalate')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowEscalate(false)}>{t('common.cancel')}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {isEditing ? (
            <Card className="shadow-premium">
              <CardContent className="p-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <Label htmlFor="title">{t('tasks.taskTitle')}</Label>
                    <Input id="title" {...register('title')} disabled={isSaving} className="mt-1" />
                    {errors.title && <p className="text-sm text-destructive mt-1">{errors.title.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="description">{t('tasks.description')}</Label>
                    <textarea
                      id="description"
                      {...register('description')}
                      disabled={isSaving}
                      rows={4}
                      className="mt-1 w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="dueAt">{t('tasks.dueDate')}</Label>
                      <Input id="dueAt" type="datetime-local" {...register('dueAt')} disabled={isSaving} className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="priority">{t('tasks.priority')}</Label>
                      <select id="priority" {...register('priority')} disabled={isSaving} className="mt-1 w-full h-9 px-3 border border-input rounded-md bg-background text-foreground">
                        <option value="LOW">{t('tasks.priorityLow')}</option>
                        <option value="MEDIUM">{t('tasks.priorityMedium')}</option>
                        <option value="HIGH">{t('tasks.priorityHigh')}</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="status">{t('common.status')}</Label>
                    <select id="status" {...register('status')} disabled={isSaving} className="mt-1 w-full h-9 px-3 border border-input rounded-md bg-background text-foreground">
                      <option value="OPEN">{t('tasks.statusOpen')}</option>
                      <option value="DONE">{t('tasks.statusDone')}</option>
                      <option value="OVERDUE">{t('tasks.statusOverdue')}</option>
                      <option value="CANCELED">{t('tasks.statusCanceled')}</option>
                    </select>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? <Loader2 className="size-4 animate-spin" /> : t('common.save')}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => { setIsEditing(false); fetchTask(); }} disabled={isSaving}>
                      {t('common.cancel')}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Task Details Card */}
              <Card className="shadow-premium">
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t('common.status')}</p>
                      <Badge variant="outline" className={`${STATUS_CONFIG[task.status]?.bg} ${STATUS_CONFIG[task.status]?.color} border`}>
                        {t(`tasks.status${task.status.charAt(0) + task.status.slice(1).toLowerCase()}`)}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t('tasks.priority')}</p>
                      <Badge variant="outline" className={`${PRIORITY_CONFIG[task.priority]?.bg} ${PRIORITY_CONFIG[task.priority]?.color} border`}>
                        {t(`tasks.priority${task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}`)}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t('tasks.dueDate')}</p>
                      <p className="font-medium flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-muted-foreground" />
                        {formatDateTime(task.dueAt)}
                      </p>
                    </div>
                    {task.slaDeadline && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t('tasks.slaDeadline')}</p>
                        <p className="font-medium flex items-center gap-1.5">
                          <Clock className="size-3.5 text-muted-foreground" />
                          {formatDateTime(task.slaDeadline)}
                        </p>
                      </div>
                    )}
                    {task.completedAt && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t('tasks.completedAt')}</p>
                        <p className="font-medium">{formatDateTime(task.completedAt)}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t('common.createdAt')}</p>
                      <p className="font-medium">{formatDate(task.createdAt)}</p>
                    </div>
                    {task.category && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t('tasks.category')}</p>
                        <span
                          className="inline-flex items-center gap-1 text-sm font-medium px-2 py-0.5 rounded-full border"
                          style={{ borderColor: task.category.color + '40', backgroundColor: task.category.color + '10', color: task.category.color }}
                        >
                          <Tag className="size-3" />
                          {locale === 'ar' && task.category.nameAr ? task.category.nameAr : task.category.name}
                        </span>
                      </div>
                    )}
                    {task.escalationLevel > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t('tasks.escalationLevel')}</p>
                        <Badge variant="outline" className={`${task.escalationLevel === 2 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700'} border`}>
                          <AlertTriangle className="size-3 me-1" />
                          {escalationLabels[task.escalationLevel]}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {task.description && (
                    <div className="mt-6 pt-6 border-t border-border">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{t('tasks.description')}</p>
                      <p className="text-foreground whitespace-pre-wrap">{task.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Comments / Activity Log */}
              <Card className="shadow-premium">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="size-4" />
                    {t('tasks.activityLog')} ({task._count.comments})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Add Comment */}
                  <div className="flex gap-2 mb-6">
                    <Input
                      placeholder={t('tasks.writeComment')}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAddComment();
                        }
                      }}
                      disabled={isSubmittingComment}
                    />
                    <Button size="sm" onClick={handleAddComment} disabled={!newComment.trim() || isSubmittingComment}>
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
                                  {comment.type.replace('_', ' ')}
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
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Card */}
          <Card className="shadow-premium">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="size-4" />
                {t('tasks.customer')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                href={`/${locale}/customers/${task.customer.id}`}
                className="font-medium text-primary hover:underline"
              >
                {task.customer.fullName}
              </Link>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <Phone className="size-3" />
                {task.customer.phone}
              </p>
            </CardContent>
          </Card>

          {/* Assigned To Card */}
          <Card className="shadow-premium">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="size-4" />
                {t('tasks.assignedTo')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{task.assignedTo.fullName}</p>
              <p className="text-sm text-muted-foreground">{task.assignedTo.email}</p>
            </CardContent>
          </Card>

          {/* Created By Card */}
          <Card className="shadow-premium">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="size-4" />
                {t('customers.createdBy')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{task.createdBy.fullName}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
