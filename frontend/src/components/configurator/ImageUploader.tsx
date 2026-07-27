'use client';

import { useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { uploadImage } from '@/lib/api';

interface UploadResult {
  imageKey: string;
  thumbKey: string;
  thumbUrl: string;
  quality: 'good' | 'warn' | 'blocked';
  dpi: number;
  message: string;
  width: number;
  height: number;
}

interface ImageUploaderProps {
  onUploaded: (result: UploadResult, file: File) => void;
  productSlug?: string;
  disabled?: boolean;
}

export default function ImageUploader({ onUploaded, productSlug, disabled }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const result = await uploadImage(file, productSlug);
        onUploaded(result, file);
      }
    } catch (e: any) {
      setError(e.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }, [onUploaded, productSlug]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        className={[
          'w-full border-3 border-dashed rounded-2xl p-10 flex flex-col items-center gap-4 cursor-pointer transition-colors duration-150',
          dragging ? 'border-coral bg-coral-light/50' : 'border-coral-light hover:border-coral hover:bg-coral-light/20',
          (disabled || uploading) ? 'opacity-60 pointer-events-none' : '',
        ].join(' ')}
      >
        <div className="w-16 h-16 rounded-2xl bg-coral-light flex items-center justify-center text-3xl">
          📸
        </div>
        <div className="text-center">
          <p className="font-heading font-bold text-navy text-lg">
            {uploading ? 'Uploading…' : 'Drop photos here'}
          </p>
          <p className="text-text-secondary text-sm mt-1">
            or <span className="text-coral font-semibold">tap to choose from your camera roll</span>
          </p>
          <p className="text-xs text-text-secondary mt-2">JPG, PNG, HEIC supported · max 30 MB each</p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        multiple
        className="sr-only"
        onChange={e => handleFiles(e.target.files)}
      />

      {error && (
        <div className="w-full bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <Button
        variant="outline"
        size="md"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || uploading}
        loading={uploading}
      >
        {uploading ? 'Uploading…' : 'Choose photos'}
      </Button>
    </div>
  );
}
