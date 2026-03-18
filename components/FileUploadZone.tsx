'use client';

import { useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Upload, X, FileText, Image, File, Loader2, Download, Trash2 } from 'lucide-react';
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
async function compressImage(file: File, maxSizeMB: number = 10): Promise<File> {
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

// Compress any file using gzip (CompressionStream API)
async function compressFileGzip(file: File): Promise<File> {
  try {
    // Check if CompressionStream is available
    if (typeof CompressionStream === 'undefined') {
      return file; // fallback: return original if not supported
    }

    const stream = file.stream();
    const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
    const reader = compressedStream.getReader();
    const chunks: BlobPart[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(new Uint8Array(value) as unknown as BlobPart);
    }

    const compressedBlob = new Blob(chunks, { type: 'application/gzip' });

    // Only use compressed version if it's actually smaller
    if (compressedBlob.size >= file.size) {
      return file;
    }

    const compressedFile = new window.File(
      [compressedBlob],
      file.name + '.gz',
      { type: 'application/gzip', lastModified: Date.now() }
    );

    return compressedFile;
  } catch {
    return file; // fallback on error
  }
}

// File types that are already compressed (gzip won't help)
const ALREADY_COMPRESSED_TYPES = [
  'application/pdf',
  'application/zip', 'application/x-rar-compressed',
  'application/gzip', 'application/x-gzip',
];

// Main compress function: images via Canvas, skip already-compressed formats, gzip the rest
async function compressFile(file: File): Promise<File> {
  if (file.type.startsWith('image/')) {
    return compressImage(file);
  }
  // PDFs, ZIPs, RARs are already compressed - just upload directly
  if (ALREADY_COMPRESSED_TYPES.includes(file.type)) {
    return file;
  }
  return compressFileGzip(file);
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

  const uploadFile = useCallback(async (file: File) => {
    let fileToUpload = file;

    // Auto-compress files > 15MB (images get resized, others get gzipped, PDFs/ZIPs skip)
    if (file.size > COMPRESS_THRESHOLD) {
      setCompressing(true);
      try {
        fileToUpload = await compressFile(file);
        if (fileToUpload !== file && fileToUpload.size < file.size) {
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

      toast.success(t('attachments.uploadSuccess'));
      onUploadComplete();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setUploading(false);
    }
  }, [customerId, tempSessionId, isTemp, category, subcategory, onUploadComplete, t]);

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
