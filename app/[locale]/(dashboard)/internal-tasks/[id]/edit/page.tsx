'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  ArrowLeft, Save, Loader2, FileText, AlignLeft, UserCheck,
  Building2, Tag, Flag, Calendar, Pencil, Paperclip, Upload,
  Trash2, Download, File, Image,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { DetailSkeleton } from '@/components/ui/page-skeleton';

interface User { id: string; fullName: string; }
interface Department { id: string; name: string; nameAr?: string | null; }
interface Category { id: string; name: string; nameAr?: string | null; color: string; }
interface TaskAttachment {
  id: string;
  originalName: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  uploadedBy: { id: string; fullName: string; };
}

export default function EditInternalTaskPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const id = params.id as string;

  const [loadingTask, setLoadingTask] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [dueAt, setDueAt] = useState('');

  // Attachment state
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isDeletingAttachment, setIsDeletingAttachment] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [taskRes, usersRes, deptsRes, catsRes, attachRes] = await Promise.all([
          fetch(`/api/internal-tasks/${id}`),
          fetch('/api/users?limit=1000'),
          fetch('/api/departments'),
          fetch('/api/task-categories'),
          fetch(`/api/internal-tasks/${id}/attachments`),
        ]);

        if (!taskRes.ok) {
          toast.error(t('messages.notFound', { entity: t('internalTasks.title') }));
          router.push(`/${locale}/internal-tasks`);
          return;
        }

        const { data: task } = await taskRes.json();
        setTitle(task.title || '');
        setDescription(task.description || '');
        setAssignedToId(task.assignedTo?.id || '');
        setDepartmentId(task.department?.id || '');
        setCategoryId(task.category?.id || '');
        setPriority(task.priority || 'MEDIUM');
        setDueAt(task.dueAt ? task.dueAt.split('T')[0] : '');

        if (usersRes.ok) setUsers((await usersRes.json()).data);
        if (deptsRes.ok) setDepartments((await deptsRes.json()).data);
        if (catsRes.ok) setCategories((await catsRes.json()).data);
        if (attachRes.ok) setAttachments((await attachRes.json()).data || []);
      } catch {
        toast.error(t('errors.networkError'));
        router.push(`/${locale}/internal-tasks`);
      } finally {
        setLoadingTask(false);
      }
    };

    fetchAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/internal-tasks/${id}/attachments`, { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || t('errors.networkError'));
        return;
      }
      const { data } = await res.json();
      setAttachments((prev) => [data, ...prev]);
      toast.success(t('messages.uploadSuccess') || 'File uploaded');
    } catch {
      toast.error(t('errors.networkError'));
    } finally {
      setIsUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    setIsDeletingAttachment(attachmentId);
    try {
      const res = await fetch(`/api/internal-tasks/${id}/attachments?attachmentId=${attachmentId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      toast.success(t('messages.deleteSuccess') || 'Deleted');
    } catch {
      toast.error(t('errors.networkError'));
    } finally {
      setIsDeletingAttachment(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="size-5 text-blue-500" />;
    if (mimeType === 'application/pdf') return <FileText className="size-5 text-red-500" />;
    return <File className="size-5 text-gray-500" />;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error(t('validation.required'));
      return;
    }

    setIsLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body: Record<string, any> = { title, priority };
      body.description = description || null;
      if (assignedToId) body.assignedToId = assignedToId;
      body.departmentId = departmentId || null;
      body.categoryId = categoryId || null;
      body.dueAt = dueAt || null;

      const response = await fetch(`/api/internal-tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(getApiErrorMessage(error.error || '', t));
        return;
      }

      toast.success(t('messages.updateSuccess', { entity: t('internalTasks.title') }));
      router.push(`/${locale}/internal-tasks/${id}`);
    } catch {
      toast.error(t('errors.networkError'));
    } finally {
      setIsLoading(false);
    }
  };

  if (loadingTask) {
    return (
      <div className="p-3 md:p-3.5">
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <DetailSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <PageHeader
          icon={Pencil}
          title={t('internalTasks.edit') || 'Edit Task'}
          subtitle={t('internalTasks.subtitle')}
          actions={
            <Button variant="outline" onClick={() => router.push(`/${locale}/internal-tasks/${id}`)}>
              <ArrowLeft className="size-4 me-2 rtl:-scale-x-100" />
              {t('common.back')}
            </Button>
          }
        />

        <div className="p-5 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Task Details */}
            <Card className="shadow-premium">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="size-5 text-primary" />
                  {t('internalTasks.taskDetails')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="title">{t('internalTasks.taskTitle')} *</Label>
                  <div className="relative mt-1">
                    <FileText className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      disabled={isLoading}
                      className="ps-10"
                      placeholder={t('internalTasks.taskTitle')}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">{t('internalTasks.description')}</Label>
                  <div className="relative mt-1">
                    <AlignLeft className="absolute start-3 top-3 size-4 text-muted-foreground" />
                    <textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={isLoading}
                      rows={4}
                      className="flex w-full rounded-md border border-input bg-background ps-10 pe-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                      placeholder={t('internalTasks.description')}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Assignment & Schedule */}
            <Card className="shadow-premium">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="size-5 text-primary" />
                  {t('internalTasks.assignTo')} {locale === 'ar' ? 'و' : '&'} {t('internalTasks.dueDate')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>{t('internalTasks.assignTo')} *</Label>
                    <Select value={assignedToId} onValueChange={setAssignedToId} disabled={isLoading}>
                      <SelectTrigger className="w-full mt-1">
                        <div className="flex items-center gap-2">
                          <UserCheck className="size-4 text-muted-foreground" />
                          <SelectValue placeholder={t('internalTasks.selectEmployee')} />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>{user.fullName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>{t('internalTasks.department')}</Label>
                    <Select value={departmentId} onValueChange={setDepartmentId} disabled={isLoading}>
                      <SelectTrigger className="w-full mt-1">
                        <div className="flex items-center gap-2">
                          <Building2 className="size-4 text-muted-foreground" />
                          <SelectValue placeholder={t('tasks.selectDepartment')} />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {locale === 'ar' && dept.nameAr ? dept.nameAr : dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>{t('internalTasks.category')}</Label>
                    <Select value={categoryId} onValueChange={setCategoryId} disabled={isLoading}>
                      <SelectTrigger className="w-full mt-1">
                        <div className="flex items-center gap-2">
                          <Tag className="size-4 text-muted-foreground" />
                          <SelectValue placeholder={t('tasks.selectCategory')} />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {locale === 'ar' && cat.nameAr ? cat.nameAr : cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>{t('internalTasks.priority')} *</Label>
                    <Select value={priority} onValueChange={setPriority} disabled={isLoading}>
                      <SelectTrigger className="w-full mt-1">
                        <div className="flex items-center gap-2">
                          <Flag className="size-4 text-muted-foreground" />
                          <SelectValue placeholder={t('internalTasks.priority')} />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">{t('internalTasks.priorityLow')}</SelectItem>
                        <SelectItem value="MEDIUM">{t('internalTasks.priorityMedium')}</SelectItem>
                        <SelectItem value="HIGH">{t('internalTasks.priorityHigh')}</SelectItem>
                        <SelectItem value="URGENT">{t('internalTasks.priorityUrgent')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="dueAt">{t('internalTasks.dueDate')}</Label>
                    <div className="relative mt-1">
                      <Calendar className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="dueAt"
                        type="date"
                        value={dueAt}
                        onChange={(e) => setDueAt(e.target.value)}
                        disabled={isLoading}
                        className="ps-10"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Attachments */}
            <Card className="shadow-premium">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Paperclip className="size-5 text-primary" />
                    {locale === 'ar' ? 'المرفقات' : 'Attachments'} ({attachments.length})
                  </CardTitle>
                  <label className="cursor-pointer">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleUploadFile}
                      disabled={isUploadingFile}
                      accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.mp4,.mov"
                    />
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                      {isUploadingFile ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Upload className="size-3.5" />
                      )}
                      {locale === 'ar' ? 'رفع ملف' : 'Upload'}
                    </span>
                  </label>
                </div>
              </CardHeader>
              <CardContent>
                {attachments.length === 0 ? (
                  <div className="text-center py-10 border-2 border-dashed border-border rounded-lg">
                    <Paperclip className="size-8 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      {locale === 'ar' ? 'لا توجد مرفقات بعد' : 'No attachments yet'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors group"
                      >
                        <div className="shrink-0">{getFileIcon(attachment.mimeType)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{attachment.originalName}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(attachment.fileSize)} · {attachment.uploadedBy.fullName}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a
                            href={attachment.filePath}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-md hover:bg-muted transition-colors"
                          >
                            <Download className="size-4 text-muted-foreground" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDeleteAttachment(attachment.id)}
                            disabled={isDeletingAttachment === attachment.id}
                            className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
                          >
                            {isDeletingAttachment === attachment.id ? (
                              <Loader2 className="size-4 animate-spin text-destructive" />
                            ) : (
                              <Trash2 className="size-4 text-destructive" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/${locale}/internal-tasks/${id}`)}
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
                    {t('common.save')}
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
