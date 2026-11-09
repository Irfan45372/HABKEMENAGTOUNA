import React, { useEffect, useState } from 'react';
import mammoth from 'mammoth';
import { Download, FileText, Loader2, ZoomIn, ZoomOut } from 'lucide-react';
import { extractTextFromDocxBuffer } from '../utils/letterUtils';

interface InlineWordDocViewerProps {
  fileDataUrl?: string;
  isiSuratTeks?: string;
  fileName: string;
  onDownload?: () => void;
}

function base64DataUrlToArrayBuffer(dataUrl: string): ArrayBuffer | null {
  try {
    const commaIdx = dataUrl.indexOf(',');
    if (commaIdx === -1) return null;
    const base64 = dataUrl.slice(commaIdx + 1);
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  } catch {
    return null;
  }
}

export const InlineWordDocViewer: React.FC<InlineWordDocViewerProps> = ({
  fileDataUrl,
  isiSuratTeks,
  fileName,
  onDownload,
}) => {
  const [renderedHtml, setRenderedHtml] = useState<string>('');
  const [fallbackText, setFallbackText] = useState<string>(isiSuratTeks || '');
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(fileDataUrl));
  const [zoomPercent, setZoomPercent] = useState<number>(100);

  useEffect(() => {
    let cancelled = false;

    async function renderWordDocument() {
      if (!fileDataUrl) {
        setFallbackText(isiSuratTeks || '');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const arrayBuffer = base64DataUrlToArrayBuffer(fileDataUrl);
        if (!arrayBuffer) {
          setFallbackText(isiSuratTeks || '');
          setIsLoading(false);
          return;
        }

        // Convert .docx (Word) to rich HTML including tables, bold/italic, lists, & embedded images
        const result = await mammoth.convertToHtml({ arrayBuffer });
        if (!cancelled && result.value && result.value.trim()) {
          setRenderedHtml(result.value);
          setIsLoading(false);
          return;
        }

        // Fallback to native XML paragraph extractor if mammoth returned empty
        const extracted = await extractTextFromDocxBuffer(arrayBuffer);
        if (!cancelled) {
          setFallbackText(extracted || isiSuratTeks || '');
          setIsLoading(false);
        }
      } catch {
        // Fallback to native XML extractor or isiSuratTeks (e.g. for legacy .doc)
        try {
          const arrayBuffer = base64DataUrlToArrayBuffer(fileDataUrl);
          const extracted = arrayBuffer ? await extractTextFromDocxBuffer(arrayBuffer) : '';
          if (!cancelled) {
            setFallbackText(extracted || isiSuratTeks || '');
            setIsLoading(false);
          }
        } catch {
          if (!cancelled) {
            setFallbackText(isiSuratTeks || '');
            setIsLoading(false);
          }
        }
      }
    }

    void renderWordDocument();

    return () => {
      cancelled = true;
    };
  }, [fileDataUrl, isiSuratTeks]);

  return (
    <div className="space-y-2.5">
      {/* Toolbar: Info Dokumen Word, Zoom Controls, & Tombol Unduh */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-emerald-950 text-white text-xs">
        <div className="flex items-center gap-1.5 font-bold text-amber-300">
          <FileText className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate max-w-[220px] sm:max-w-md">
            Dokumen Surat Word ({fileName})
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-emerald-900/90 border border-emerald-700 rounded-md px-1.5 py-0.5">
            <button
              type="button"
              onClick={() => setZoomPercent((z) => Math.max(80, z - 20))}
              className="p-1 hover:text-amber-300 cursor-pointer"
              title="Perkecil tampilan dokumen Word"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono-tabular px-1">{zoomPercent}%</span>
            <button
              type="button"
              onClick={() => setZoomPercent((z) => Math.min(180, z + 20))}
              className="p-1 hover:text-amber-300 cursor-pointer"
              title="Perbesar tampilan dokumen Word"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {onDownload && (
            <button
              type="button"
              onClick={onDownload}
              className="px-2.5 py-1 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3 h-3" />
              <span>Unduh Word</span>
            </button>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="p-8 rounded-xl border border-slate-300 bg-slate-50 flex flex-col items-center justify-center gap-2 text-slate-700">
          <Loader2 className="w-7 h-7 animate-spin text-emerald-700" />
          <span className="text-xs font-semibold">
            Memuat tampilan lembar dokumen Word (.DOCX) agar langsung terbaca di HP & Web...
          </span>
        </div>
      )}

      {!isLoading && (renderedHtml || fallbackText) && (
        <div className="w-full max-h-[75vh] overflow-auto rounded-xl border-2 border-slate-300 bg-slate-200/80 p-2 sm:p-4">
          <div
            className="mx-auto bg-white text-slate-900 shadow-lg rounded-lg border border-slate-300 p-4 sm:p-8"
            style={{
              width: `${zoomPercent}%`,
              maxWidth: zoomPercent > 100 ? 'none' : '100%',
              fontSize: `${Math.round((zoomPercent / 100) * 14)}px`,
            }}
          >
            {renderedHtml ? (
              <div
                className="word-doc-content space-y-3 leading-relaxed font-serif text-slate-900 [&_table]:w-full [&_table]:border-collapse [&_table]:my-3 [&_td]:border [&_td]:border-slate-400 [&_td]:p-2 [&_th]:border [&_th]:border-slate-400 [&_th]:bg-slate-100 [&_th]:p-2 [&_p]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_img]:max-w-full [&_img]:h-auto"
                dangerouslySetInnerHTML={{ __html: renderedHtml }}
              />
            ) : (
              <div className="whitespace-pre-line leading-relaxed font-serif text-slate-900">
                {fallbackText}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
