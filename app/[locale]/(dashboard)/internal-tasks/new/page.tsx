'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
  ArrowLeft,
  Save,
  Loader2,
  FileText,
  AlignLeft,
  UserCheck,
  Building2,
  Tag,
  Flag,
  Calendar,
  PlusCircle,
  Paperclip,
  Upload,
  Trash2,
  File,
  Image,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';

interface User {
  id: string;
  fullName: string;
}

interface TempAttachment {
  id: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  filePath: string;
}

interface Department {
  id: string;
  name: string;
  nameAr?: string | null;
}

interface Category {
  id: string;
  name: string;
  nameAr?: string | null;
  color: string;
}

export default function CreateInternalTaskPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

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
  const tempSessionId = useMemo(() => `temp_task_${crypto.randomUUID()}`, []);
  const [attachments, setAttachments] = useState<TempAttachment[]>([]);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, deptsRes, catsRes] = await Promise.all([
          fetch('/api/users?limit=1000'),
          fetch('/api/departments'),
          fetch('/api/task-categories'),
        ]);

        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setUsers(usersData.data);
        }

        if (deptsRes.ok) {
          const deptsData = await deptsRes.json();
          setDepartments(deptsData.data);
        }

        if (catsRes.ok) {
          const catsData = await catsRes.json();
          setCategories(catsData.data);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };

    fetchData();
  }, []);

  const cleanupTempAttachments = async () => {
    if (attachments.length === 0) return;
    await Promise.allSettled(
      attachments.map((a) =>
        fetch(`/api/attachments/temp?attachmentId=${a.id}`, { method: 'DELETE' })
      )
    );
  };

  const handleFileUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setIsUploadingFile(true);
    try {
      for (const file of fileArray) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', 'TASK_FILE');
        formData.append('tempSessionId', tempSessionId);

        const res = await fetch('/api/attachments/temp', { method: 'POST', body: formData });
        if (!res.ok) {
          const err = await res.json();
          toast.error(err.error || 'Upload failed');
          continue;
        }
        const { data } = await res.json();
        setAttachments((prev) => [...prev, data]);
      }
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      const res = await fetch(`/api/attachments/temp?attachmentId=${attachmentId}`, { method: 'DELETE' });
      if (res.ok) {
        setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      }
    } catch {
      toast.error('Failed to delete file');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="size-4 text-blue-500" />;
    return <File className="size-4 text-gray-500" />;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error(t('validation.required'));
      return;
    }

    setIsLoading(true);
    try {
      const body: Record<string, string> = {
        title,
        priority,
      };

      if (description) body.description = description;
      if (assignedToId) body.assignedToId = assignedToId;
      if (departmentId) body.departmentId = departmentId;
      if (categoryId) body.categoryId = categoryId;
      if (dueAt) body.dueAt = dueAt;

      const response = await fetch('/api/internal-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(getApiErrorMessage(error.error || '', t));
        return;
      }

      const task = await response.json();

      // Link any temp attachments to the created task
      if (attachments.length > 0) {
        try {
          await fetch('/api/attachments/link-task', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tempSessionId, internalTaskId: task.data.id }),
          });
        } catch {
          console.error('Failed to link attachments');
        }
      }

      toast.success(t('messages.createSuccess', { entity: t('internalTasks.title') }));
      router.push(`/${locale}/internal-tasks`);
    } catch {
      toast.error(t('errors.networkError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
      {/* Header */}
      <PageHeader
        icon={PlusCircle}
        title={t('internalTasks.create')}
        subtitle={t('internalTasks.subtitle')}
        actions={
          <Button variant="outline" onClick={() => router.push(`/${locale}/internal-tasks`)}>
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
            {/* Title */}
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

            {/* Description */}
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
              {t('internalTasks.assignTo')} {t('common.and')} {t('internalTasks.dueDate')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Assign To */}
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
                      <SelectItem key={user.id} value={user.id}>
                        {user.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Department */}
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

              {/* Category */}
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

              {/* Priority */}
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

              {/* Due Date */}
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
            <CardTitle className="flex items-center gap-2">
              <Paperclip className="size-5 text-primary" />
              Attachments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                isDragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                handleFileUpload(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.mp4,.mov"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              />
              {isUploadingFile ? (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Loader2 className="size-8 animate-spin text-primary" />
                  <p className="text-sm">Uploading...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Upload className="size-8" />
                  <p className="text-sm font-medium">Drop files here or click to browse</p>
                  <p className="text-xs">PDF, Word, Excel, Images, ZIP — max 20MB each</p>
                </div>
              )}
            </div>

            {/* File List */}
            {attachments.length > 0 && (
              <div className="space-y-2">
                {attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20 group">
                    {getFileIcon(attachment.mimeType)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{attachment.originalName}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(attachment.fileSize)}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDeleteAttachment(attachment.id)}
                    >
                      <X className="size-4" />
                    </Button>
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
            onClick={async () => { await cleanupTempAttachments(); router.push(`/${locale}/internal-tasks`); }}
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
      </div>
    </div>
  );
}
