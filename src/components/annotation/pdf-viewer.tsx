'use client';

import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface PdfViewerProps {
    file: string;
    pageNumber: number;
    onLoadSuccess: (info: { numPages: number }) => void;
}

export default function PdfViewer({ file, pageNumber, onLoadSuccess }: PdfViewerProps) {
    return (
        <Document
            file={file}
            onLoadSuccess={onLoadSuccess}
            loading={
                <div className="flex items-center justify-center p-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
            }
            error={
                <div className="text-red-500 p-4">Failed to load PDF.</div>
            }
        >
            <Page
                pageNumber={pageNumber}
                renderAnnotationLayer={false}
                renderTextLayer={false}
                className="bg-white shadow-lg"
                width={720}
            />
        </Document>
    );
}
