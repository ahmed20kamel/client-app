'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Paperclip, Upload, Trash2, FileText, Image, FileSpreadsheet, Loader2, ExternalLink } from 'lucide-react';

interface Attachment {
  id: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  filePath: string;
  category: string;
  createdAt: string;
  uploadedBy: { fullName: string };
}

interface AttachmentsPanelProps {
  entityType: 'quotation' | 'tax-invoice';
  entityId: string;
  readonly?: boolean;
}

function fileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <Image className="size-4 text-blue-500" />;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <FileSpreadsheet className="size-4 text-green-600" />;
  return <FileText className="size-4 text-muted-foreground" />;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentsPanel({ entityType, entityId, readonly = false }: AttachmentsPanelProps) {
  const t = useTranslations();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const apiBase = entityType === 'quotation'
    ? `/api/quotations/${entityId}/attachments`
    : `/api/tax-invoices/${entityId}/attachments`;

  useEffect(() => {
    fetch(apiBase)
      .then(r => r.json())
      .then(d => setAttachments(d.data || []))
      .catch(() => toast.error(t('common.error')))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('category', 'document');
      const res = await fetch(apiBase, { method: 'POST', body: fd });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || t('common.error'));
        return;
      }
      const { data } = await res.json();
      setAttachments(prev => [data, ...prev]);
      toast.success(t('attachments.uploaded'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`${apiBase}?attachmentId=${id}`, { method: 'DELETE' });
      if (!res.ok) { toast.error(t('common.error')); return; }
      setAttachments(prev => prev.filter(a => a.id !== id));
      toast.success(t('attachments.deleted'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Paperclip className="size-4 text-primary" />
          {t('attachments.title')}
          {attachments.length > 0 && (
            <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{attachments.length}</span>
          )}
        </h3>
        {!readonly && (
          <>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
              onChange={handleUpload}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? <Loader2 className="size-3.5 me-1.5 animate-spin" /> : <Upload className="size-3.5 me-1.5" />}
              {t('attachments.upload')}
            </Button>
          </>
        )}
      </div>

      {loading ? (
        <div className="py-6 text-center text-sm text-muted-foreground">{t('common.loading')}</div>
      ) : attachments.length === 0 ? (
        <div className="py-6 text-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">
          {t('attachments.noAttachments')}
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map(att => (
            <div key={att.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors">
              {fileIcon(att.mimeType)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{att.originalName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(att.fileSize)} · {att.uploadedBy.fullName}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <a href={att.filePath} target="_blank" rel="noopener noreferrer">
                  <Button type="button" variant="ghost" size="icon" className="size-7">
                    <ExternalLink className="size-3.5" />
                  </Button>
                </a>
                {!readonly && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    disabled={deletingId === att.id}
                    onClick={() => handleDelete(att.id)}
                  >
                    {deletingId === att.id
                      ? <Loader2 className="size-3.5 animate-spin" />
                      : <Trash2 className="size-3.5" />
                    }
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
