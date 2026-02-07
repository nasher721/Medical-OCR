'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useOrgStore } from '@/lib/hooks/use-org';
import { v4 as uuidv4 } from 'uuid';

interface UploadDialogProps {
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
}

export function UploadDialog({ open, onClose, onUploaded }: UploadDialogProps) {
  const supabase = createClient();
  const { currentOrg } = useOrgStore();
  const [files, setFiles] = useState<File[]>([]);
  const [docType, setDocType] = useState('invoice');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      f => f.type === 'application/pdf' || f.type.startsWith('image/')
    );
    setFiles(prev => [...prev, ...droppedFiles]);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
  };

  const handleUpload = async () => {
    if (!currentOrg || files.length === 0) return;
    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const docId = uuidv4();
      setProgress(`Uploading ${i + 1}/${files.length}: ${file.name}`);

      const storagePath = `${currentOrg.id}/${docId}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, file);

      if (uploadError) {
        setProgress(`Error uploading ${file.name}: ${uploadError.message}`);
        continue;
      }

      // Create document record
      const resp = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: currentOrg.id,
          filename: file.name,
          storage_path: storagePath,
          mime_type: file.type,
          doc_type: docType,
        }),
      });

      if (resp.ok) {
        const { data: doc } = await resp.json();
        setProgress(`Processing ${file.name}...`);
        // Auto-trigger extraction
        await fetch(`/api/documents/${doc.id}/process`, { method: 'POST' });
      }
    }

    setUploading(false);
    setFiles([]);
    setProgress('');
    onUploaded();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Upload Documents</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`mb-4 flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
            dragOver ? 'border-primary bg-primary/5' : 'border-border'
          }`}
        >
          <svg className="mb-2 h-10 w-10 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
          <p className="text-sm text-muted-foreground">Drag & drop files here, or</p>
          <label className="mt-2 cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Browse Files
            <input type="file" accept=".pdf,.png,.jpg,.jpeg" multiple onChange={handleFileChange} className="hidden" />
          </label>
          <p className="mt-2 text-xs text-muted-foreground">PDF, PNG, JPG up to 50MB</p>
        </div>

        {files.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-sm font-medium">{files.length} file(s) selected:</p>
            <div className="max-h-32 overflow-auto rounded border p-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between py-1 text-sm">
                  <span className="truncate">{f.name}</span>
                  <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} className="ml-2 text-red-500 hover:text-red-700">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium">Document Type</label>
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="w-full rounded-lg border border-input px-3 py-2 text-sm"
          >
            <option value="invoice">Invoice</option>
            <option value="receipt">Receipt</option>
            <option value="form">Form</option>
            <option value="other">Other</option>
          </select>
        </div>

        {progress && (
          <div className="mb-4 rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-700">
            {progress}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">Cancel</button>
          <button
            onClick={handleUpload}
            disabled={uploading || files.length === 0}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : `Upload ${files.length} file(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}
