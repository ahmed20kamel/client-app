'use client';

import { useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Upload, FileText, Image, File, Loader2, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type Attachment = {
  id: string;
  category: string;
  subcategory: string | null;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  filePath: string;
  createdAt: string;
};

interface FileUploadZoneProps {
  customerId?: string;
  tempSessionId?: string;
  category: string;
  subcategory?: string;
  attachments: Attachment[];
  onUploadComplete: () => void;
  disabled?: boolean;
}

const COMPRESS_THRESHOLD = 15 * 1024 * 1024; // 15MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <Image className="size-5 text-blue-500" />;
  if (mimeType === 'application/pdf') return <FileText className="size-5 text-red-500" />;
  return <File className="size-5 text-muted-foreground" />;
}

// Compress image using Canvas - reduce quality and dimensions
async function compressImage(file: File, maxSizeMB: number = 9): Promise<File> {
  return new Promise((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');

      let { width, height } = img;
      const maxDim = 4096;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);

      let quality = 0.8;
      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) { resolve(file); return; }
            if (blob.size > maxSizeMB * 1024 * 1024 && quality > 0.1) {
              quality -= 0.1;
              tryCompress();
            } else {
              const compressed = new window.File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressed);
            }
          },
          'image/jpeg',
          quality
        );
      };
      tryCompress();
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

export function FileUploadZone({
  customerId,
  tempSessionId,
  category,
  subcategory,
  attachments,
  onUploadComplete,
  disabled = false,
}: FileUploadZoneProps) {
  const t = useTranslations();
  const [uploading, setUploading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isTemp = !customerId && !!tempSessionId;

  const filteredAttachments = attachments.filter(
    a => a.category === category && (subcategory ? a.subcategory === subcategory : true)
  );

  // Direct unsigned upload to Cloudinary for large files (bypasses Vercel 4.5MB body limit)
  const uploadDirectToCloudinary = useCallback(async (file: File): Promise<{ url: string; publicId: string } | null> => {
    try {
      // 1. Get upload preset from our API
      const signRes = await fetch('/api/attachments/sign');
      if (!signRes.ok) return null;
      const { cloudName, uploadPreset } = await signRes.json();

      // 2. Upload directly to Cloudinary with unsigned preset (files are public by default)
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
        { method: 'POST', body: formData }
      );

      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({}));
        console.error('Cloudinary upload failed:', errData);
        return null;
      }

      const resultData = await uploadRes.json();
      return { url: resultData.secure_url, publicId: resultData.public_id };
    } catch (err) {
      console.error('Direct upload error:', err);
      return null;
    }
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    let fileToUpload = file;

    // Auto-compress images > 15MB
    if (file.size > COMPRESS_THRESHOLD && file.type.startsWith('image/')) {
      setCompressing(true);
      try {
        fileToUpload = await compressImage(file);
        if (fileToUpload.size < file.size) {
          toast.info(t('attachments.compressed', {
            original: formatFileSize(file.size),
            compressed: formatFileSize(fileToUpload.size),
          }));
        }
      } finally {
        setCompressing(false);
      }
    }

    setUploading(true);
    try {
      const VERCEL_LIMIT = 3 * 1024 * 1024; // 3MB - safe limit under Vercel 4.5MB body limit

      if (fileToUpload.size > VERCEL_LIMIT) {
        // Large file: upload directly to Cloudinary, then save record via our API
        const result = await uploadDirectToCloudinary(fileToUpload);
        if (!result) {
          toast.error(t('common.error'));
          return;
        }

        // Save the attachment record to our DB
        const saveRes = await fetch('/api/attachments/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId: customerId || null,
            tempSessionId: isTemp ? tempSessionId : null,
            category,
            subcategory: subcategory || null,
            fileName: result.publicId,
            originalName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            filePath: result.url,
          }),
        });

        if (!saveRes.ok) {
          toast.error(t('common.error'));
          return;
        }
      } else {
        // Small file: upload through our API (normal flow)
        const formData = new FormData();
        formData.append('file', fileToUpload);
        formData.append('category', category);
        if (subcategory) formData.append('subcategory', subcategory);

        let url: string;
        if (isTemp) {
          formData.append('tempSessionId', tempSessionId!);
          url = '/api/attachments/temp';
        } else {
          url = `/api/customers/${customerId}/attachments`;
        }

        const res = await fetch(url, {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const error = await res.json();
          toast.error(error.error || t('common.error'));
          return;
        }
      }

      toast.success(t('attachments.uploadSuccess'));
      onUploadComplete();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setUploading(false);
    }
  }, [customerId, tempSessionId, isTemp, category, subcategory, onUploadComplete, t, uploadDirectToCloudinary]);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => uploadFile(file));
  }, [uploadFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!disabled) handleFiles(e.dataTransfer.files);
  }, [disabled, handleFiles]);

  const deleteAttachment = async (attachmentId: string) => {
    try {
      let url: string;
      if (isTemp) {
        url = `/api/attachments/temp?attachmentId=${attachmentId}`;
      } else {
        url = `/api/customers/${customerId}/attachments?attachmentId=${attachmentId}`;
      }

      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) {
        toast.error(t('common.error'));
        return;
      }
      onUploadComplete();
    } catch {
      toast.error(t('common.error'));
    }
  };

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-all ${
          dragOver
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-secondary/30'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
          disabled={disabled}
          accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx,.xls,.xlsx,.dwg,.dxf,.zip,.rar"
        />
        {compressing ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="size-4 text-orange-500 animate-spin" />
            <p className="text-xs text-muted-foreground">{t('attachments.compressing')}</p>
          </div>
        ) : uploading ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="size-4 text-primary animate-spin" />
            <p className="text-xs text-muted-foreground">{t('attachments.uploading')}</p>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <Upload className="size-4 text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground">
              {t('attachments.dropHere')}
            </p>
          </div>
        )}
      </div>

      {/* Uploaded Files List */}
      {filteredAttachments.length > 0 && (
        <div className="space-y-2">
          {filteredAttachments.map(attachment => (
            <div
              key={attachment.id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-secondary/30 transition-colors group"
            >
              {getFileIcon(attachment.mimeType)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{attachment.originalName}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(attachment.fileSize)}</p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <a
                  href={attachment.filePath}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                >
                  <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-primary">
                    <Download className="size-4" />
                  </Button>
                </a>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteAttachment(attachment.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
