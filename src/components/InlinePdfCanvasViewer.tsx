import React, { useEffect, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { ExternalLink, FileText, Loader2, ZoomIn, ZoomOut } from 'lucide-react';

// Configure PDF.js worker using bundled Vite asset URL with CDN fallback
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    pdfWorkerUrl ||
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
} catch {
  // Ignore worker init error
}

interface InlinePdfCanvasViewerProps {
  fileDataUrl?: string;
  blobUrl?: string | null;
  fileName: string;
}

function base64DataUrlToUint8Array(dataUrl: string): Uint8Array | null {
  try {
    const commaIdx = dataUrl.indexOf(',');
    if (commaIdx === -1) return null;
    const base64 = dataUrl.slice(commaIdx + 1);
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

export const InlinePdfCanvasViewer: React.FC<InlinePdfCanvasViewerProps> = ({
  fileDataUrl,
  blobUrl,
  fileName,
}) => {
  const [pageDataUrls, setPageDataUrls] = useState<string[]>([]);
  const [numPages, setNumPages] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [zoomPercent, setZoomPercent] = useState<number>(100);

  useEffect(() => {
    let cancelled = false;

    async function renderPdfPages() {
      if (!fileDataUrl && !blobUrl) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setRenderError(null);
      setPageDataUrls([]);

      try {
        const bytes = fileDataUrl ? base64DataUrlToUint8Array(fileDataUrl) : null;
        const loadingTask = bytes
          ? pdfjsLib.getDocument({ data: bytes })
          : pdfjsLib.getDocument({ url: blobUrl! });

        const pdfDoc = await loadingTask.promise;
        if (cancelled) return;

        setNumPages(pdfDoc.numPages);
        const renderedPages: string[] = [];

        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
          if (cancelled) return;
          const page = await pdfDoc.getPage(pageNum);
          // Use high scale (2.0) so text in letters & SK tables is crystal-clear on Android & Desktop
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;

          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({
            canvasContext: ctx,
            viewport,
            canvas,
          }).promise;

          renderedPages.push(canvas.toDataURL('image/jpeg', 0.92));
        }

        if (!cancelled) {
          setPageDataUrls(renderedPages);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Gagal merender halaman PDF:', err);
          setRenderError(
            'Pratinjau halaman PDF sedang dimuat. Anda juga dapat menekan tombol Unduh Surat (.PDF) di bawah.'
          );
          setIsLoading(false);
        }
      }
    }

    void renderPdfPages();

    return () => {
      cancelled = true;
    };
  }, [fileDataUrl, blobUrl]);

  return (
    <div className="space-y-2.5">
      {/* Toolbar: Info Halaman, Zoom Controls, & Buka Tab Baru */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-emerald-950 text-white text-xs">
        <div className="flex items-center gap-1.5 font-bold text-amber-300">
          <FileText className="w-3.5 h-3.5 shrink-0" />
          <span>
            Isi Dokumen PDF ({numPages > 0 ? `${numPages} Halaman` : fileName})
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {pageDataUrls.length > 0 && (
            <div className="flex items-center gap-1 bg-emerald-900/90 border border-emerald-700 rounded-md px-1.5 py-0.5">
              <button
                type="button"
                onClick={() => setZoomPercent((z) => Math.max(75, z - 25))}
                className="p-1 hover:text-amber-300 cursor-pointer"
                title="Perkecil tampilan surat"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono-tabular px-1">{zoomPercent}%</span>
              <button
                type="button"
                onClick={() => setZoomPercent((z) => Math.min(200, z + 25))}
                className="p-1 hover:text-amber-300 cursor-pointer"
                title="Perbesar tampilan surat"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {blobUrl && (
            <a
              href={blobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-300 hover:underline font-semibold flex items-center gap-1"
            >
              <span>Buka File PDF</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="p-8 rounded-xl border border-slate-300 bg-slate-50 flex flex-col items-center justify-center gap-2 text-slate-700">
          <Loader2 className="w-7 h-7 animate-spin text-emerald-700" />
          <span className="text-xs font-semibold">
            Memuat tampilan lembar surat PDF agar langsung terbaca di HP / Web...
          </span>
        </div>
      )}

      {/* Rendered PDF Pages directly visible on Android, iOS, and Desktop */}
      {!isLoading && pageDataUrls.length > 0 && (
        <div className="w-full max-h-[75vh] overflow-auto rounded-xl border-2 border-slate-300 bg-slate-200/80 p-2 sm:p-4 space-y-4">
          {pageDataUrls.map((dataUrl, idx) => (
            <div
              key={idx}
              className="mx-auto bg-white shadow-lg rounded-lg overflow-hidden border border-slate-300"
              style={{ width: `${zoomPercent}%`, maxWidth: zoomPercent > 100 ? 'none' : '100%' }}
            >
              <div className="px-3 py-1 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-[11px] font-semibold text-slate-600">
                <span>
                  Halaman {idx + 1} dari {numPages}
                </span>
                <span className="truncate max-w-[200px]">{fileName}</span>
              </div>
              <img
                src={dataUrl}
                alt={`${fileName} - Halaman ${idx + 1}`}
                className="w-full h-auto block select-none"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      )}

      {/* Fallback if PDF could not be rendered */}
      {!isLoading && pageDataUrls.length === 0 && renderError && (
        <div className="p-4 rounded-xl border border-amber-400/60 bg-amber-50 text-slate-800 text-xs space-y-2">
          <p className="font-semibold">{renderError}</p>
        </div>
      )}
    </div>
  );
};
