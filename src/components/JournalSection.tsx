import React, { useEffect, useMemo, useState } from 'react';
import { JournalArticle } from '../types/hab';
import {
  compressBannerImageFile,
  filterJournalArticles,
  normalizeBannerImageUrl,
} from '../utils/habLogic';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Check,
  ChevronRight,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Globe,
  Home,
  Image as ImageIcon,
  Link2,
  Lock,
  Plus,
  Search,
  Share2,
  Trash2,
  Unlock,
  Upload,
  User,
  X,
} from 'lucide-react';

interface JournalSectionProps {
  journals: JournalArticle[];
  satkerList: string[];
  selectedJournalId: string | null;
  onSelectJournalId: (id: string | null) => void;
  onBackToPortal: () => void;
  adminPin: string;
  isAdminUnlocked: boolean;
  onUnlockAdmin: () => void;
  onAddJournal: (article: JournalArticle) => void;
  onUpdateJournal: (id: string, partial: Partial<JournalArticle>) => void;
  onDeleteJournal: (id: string) => void;
}

/**
 * Updates OpenGraph & document title dynamically for the active journal article.
 */
function updateHeadMetaForJournal(article: JournalArticle | null) {
  if (!article) {
    document.title = 'Jurnal & Berita Resmi — HAB ke-81 Kemenag Tojo Una-Una';
    return;
  }
  document.title = `${article.judul} — Jurnal HAB ke-81 Kemenag Touna`;

  const setMeta = (selector: string, content: string) => {
    const el = document.querySelector(selector);
    if (el) el.setAttribute('content', content);
  };

  setMeta('meta[property="og:title"]', article.judul);
  setMeta('meta[name="twitter:title"]', article.judul);
  setMeta('meta[property="og:description"]', article.leadParagraf || article.judul);
  setMeta('meta[name="description"]', article.leadParagraf || article.judul);
  if (article.photos[0] && !article.photos[0].startsWith('data:image/svg')) {
    setMeta('meta[property="og:image"]', article.photos[0]);
    setMeta('meta[name="twitter:image"]', article.photos[0]);
  }
}

/**
 * Loads an image safely onto an HTMLImageElement (ensuring explicit dimensions for inline SVGs
 * and CORS-safe loading for external URLs so canvas.toBlob() never fails or taints).
 */
async function loadPhotoForCanvas(photoSrc: string): Promise<HTMLImageElement | null> {
  const tryLoad = (src: string, useCors: boolean): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      if (useCors) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = src;
    });

  // Inline SVG DataURL: ensure explicit width/height attributes so Chrome/Edge always rasterize at 1200x675
  if (photoSrc.startsWith('data:image/svg+xml')) {
    try {
      const commaIdx = photoSrc.indexOf(',');
      if (commaIdx !== -1) {
        const header = photoSrc.slice(0, commaIdx);
        const payload = photoSrc.slice(commaIdx + 1);
        let svgText = header.includes(';base64')
          ? window.atob(payload)
          : decodeURIComponent(payload);
        if (!/\bwidth\s*=/.test(svgText.slice(0, 220))) {
          svgText = svgText.replace('<svg', '<svg width="1200" height="675"');
        }
        const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
        const blobUrl = URL.createObjectURL(svgBlob);
        try {
          return await tryLoad(blobUrl, false);
        } finally {
          window.setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
        }
      }
    } catch {
      // Fall through to standard load
    }
  }

  try {
    return await tryLoad(photoSrc, !photoSrc.startsWith('data:'));
  } catch {
    // Retry external HTTP(S) images through CORS-enabled image proxy
    if (photoSrc.startsWith('http://') || photoSrc.startsWith('https://')) {
      try {
        const proxied = `https://wsrv.nl/?url=${encodeURIComponent(
          photoSrc.replace(/^https?:\/\//, '')
        )}&w=1200&h=675&fit=cover&output=png`;
        return await tryLoad(proxied, true);
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Renders the article's Foto Utama onto a 1200x675 branded canvas (with HAB ke-81 watermark & headline).
 */
async function createShareablePhotoCanvas(
  photoSrc: string,
  title: string
): Promise<HTMLCanvasElement | null> {
  try {
    const img = await loadPhotoForCanvas(photoSrc);
    if (!img) return null;

    const canvas = document.createElement('canvas');
    const w = 1200;
    const h = 675;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    // Fill background
    ctx.fillStyle = '#021b15';
    ctx.fillRect(0, 0, w, h);

    // Draw cover image
    const natW = img.naturalWidth || w;
    const natH = img.naturalHeight || h;
    const scale = Math.max(w / natW, h / natH);
    const dw = natW * scale;
    const dh = natH * scale;
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);

    // Subtle bottom gradient bar with official watermark
    const grad = ctx.createLinearGradient(0, h - 130, 0, h);
    grad.addColorStop(0, 'rgba(2,27,21,0)');
    grad.addColorStop(1, 'rgba(2,27,21,0.92)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, h - 130, w, 130);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('JURNAL RESMI HAB KE-81 KEMENAG KAB. TOJO UNA-UNA', 32, h - 56);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    const shortTitle = title.length > 72 ? title.slice(0, 72) + '...' : title;
    ctx.fillText(shortTitle, 32, h - 24);

    return canvas;
  } catch {
    return null;
  }
}

/**
 * Converts an image URL or DataURL into a JPEG File object so mobile browsers
 * can share the actual Foto Utama image file + link directly to WhatsApp!
 */
async function createShareablePhotoFile(
  photoSrc: string,
  title: string
): Promise<File | null> {
  const canvas = await createShareablePhotoCanvas(photoSrc, title);
  if (!canvas) return null;
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.88)
  );
  if (!blob) return null;
  return new File([blob], 'jurnal-kemenag-touna.jpg', { type: 'image/jpeg' });
}

/**
 * Copies the article's 1 Foto Utama directly as a PNG image into the PC/Laptop clipboard
 * so pressing Ctrl+V in WhatsApp Web immediately attaches the photo alongside the pre-filled text!
 */
async function copyMainPhotoToClipboard(
  photoSrc: string,
  title: string
): Promise<'copied' | 'downloaded' | 'failed'> {
  if (!photoSrc) return 'failed';

  const makePngBlob = async (): Promise<Blob> => {
    const canvas = await createShareablePhotoCanvas(photoSrc, title);
    if (!canvas) throw new Error('Canvas render failed');
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png')
    );
    if (!blob) throw new Error('PNG blob failed');
    return blob;
  };

  // Use Promise-backed ClipboardItem when supported so the browser preserves user-activation gesture
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    'write' in navigator.clipboard &&
    typeof ClipboardItem !== 'undefined'
  ) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': makePngBlob() }),
      ]);
      return 'copied';
    } catch {
      try {
        const blob = await makePngBlob();
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        return 'copied';
      } catch {
        // Fall through to JPEG download fallback
      }
    }
  }

  // Fallback for browsers that disallow image clipboard write: download the photo directly
  try {
    const file = await createShareablePhotoFile(photoSrc, title);
    if (!file) return 'failed';
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'foto-utama-jurnal-hab81.jpg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    return 'downloaded';
  } catch {
    return 'failed';
  }
}

export const JournalSection: React.FC<JournalSectionProps> = ({
  journals,
  satkerList,
  selectedJournalId,
  onSelectJournalId,
  onBackToPortal,
  adminPin,
  isAdminUnlocked,
  onUnlockAdmin,
  onAddJournal,
  onUpdateJournal,
  onDeleteJournal,
}) => {
  const approvedJournals = useMemo(
    () => journals.filter((j) => j.disetujui !== false),
    [journals]
  );
  const activeArticle =
    approvedJournals.find((j) => j.id === selectedJournalId) ||
    approvedJournals[0] ||
    null;

  const [viewMode, setViewMode] = useState<'reader' | 'list'>(
    selectedJournalId ? 'reader' : 'reader'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showWriteModal, setShowWriteModal] = useState<boolean>(false);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);

  const filteredJournals = useMemo(
    () => filterJournalArticles(approvedJournals, searchQuery),
    [approvedJournals, searchQuery]
  );

  // Form states for creating/editing a Journal Article with up to 4 photos
  const [judul, setJudul] = useState('');
  const [kategoriLokasi, setKategoriLokasi] = useState('TOJO UNA UNA');
  const [penulis, setPenulis] = useState('');
  const [satker, setSatker] = useState(
    satkerList[0] || 'Kantor Kemenag Kab. Tojo Una-Una (Induk)'
  );
  const [tanggalWaktu, setTanggalWaktu] = useState('');
  const [leadParagraf, setLeadParagraf] = useState('');
  const [isiBerita, setIsiBerita] = useState('');
  const [captionFotoUtama, setCaptionFotoUtama] = useState('');
  const [photoSlots, setPhotoSlots] = useState<[string, string, string, string]>([
    '',
    '',
    '',
    '',
  ]);
  const [compressingSlot, setCompressingSlot] = useState<number | null>(null);
  const [formNotice, setFormNotice] = useState<string | null>(null);

  // Share & PIN states
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [copiedShareKey, setCopiedShareKey] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [waWebShareModal, setWaWebShareModal] = useState<{
    article: JournalArticle;
    previewDataUrl: string | null;
    copyState: 'preparing' | 'copied' | 'needs_manual';
  } | null>(null);
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedJournalId) {
      setViewMode('reader');
    }
  }, [selectedJournalId]);

  useEffect(() => {
    updateHeadMetaForJournal(activeArticle);
  }, [activeArticle]);

  const getArticleShareUrl = (articleId: string): string => {
    return `https://hab-kemenag-touna.ai.studio/?jurnal=${encodeURIComponent(articleId)}`;
  };

  const buildWhatsAppShareText = (article: JournalArticle): string => {
    const url = getArticleShareUrl(article.id);
    const leadSnippet =
      article.leadParagraf.length > 200
        ? article.leadParagraf.slice(0, 200) + '...'
        : article.leadParagraf;
    return `*${article.judul}*\n📅 ${article.tanggalWaktu}\n✍️ Oleh: ${article.penulis}\n\n_${leadSnippet}_\n\n👉 *Baca selengkapnya & lihat dokumentasi foto di Jurnal Resmi HAB ke-81 Kemenag Tojo Una-Una:*\n${url}`;
  };

  const copyTextToClipboard = async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Fallback below
    }
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  };

  const triggerCopiedBadge = (key: string, message: string) => {
    setCopiedShareKey(key);
    setShareStatus(message);
    window.setTimeout(() => {
      setCopiedShareKey((prev) => (prev === key ? null : prev));
    }, 3000);
    window.setTimeout(() => setShareStatus(null), 3500);
  };

  const handleShareWhatsAppWithPhoto = async (article: JournalArticle) => {
    const shareText = buildWhatsAppShareText(article);

    // 1. Try Native Web Share API with Foto Utama File attached (works on Android/iOS for WhatsApp!)
    if (navigator.share && article.photos[0]) {
      try {
        const photoFile = await createShareablePhotoFile(article.photos[0], article.judul);
        if (
          photoFile &&
          navigator.canShare &&
          navigator.canShare({ files: [photoFile] })
        ) {
          await navigator.share({
            title: article.judul,
            text: shareText,
            files: [photoFile],
          });
          return;
        }
      } catch {
        // Fallback to standard link share if user cancels or browser doesn't support file share
      }
    }

    // 2. Fallback: Copy 1 Foto Utama to clipboard (for Ctrl+V) & open WhatsApp App click-to-chat
    const photoResult = article.photos[0]
      ? await copyMainPhotoToClipboard(article.photos[0], article.judul)
      : 'failed';

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    const a = document.createElement('a');
    a.href = waUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();

    if (photoResult === 'copied') {
      setShareStatus(
        '✓ 1 Foto Utama sudah disalin! Di WhatsApp tekan Ctrl+V agar Foto Utama tampil bersama teks berita.'
      );
    } else if (photoResult === 'downloaded') {
      setShareStatus(
        '✓ 1 Foto Utama otomatis diunduh — silakan seret/lampirkan foto tersebut bersama teks berita di WhatsApp.'
      );
    } else {
      await copyTextToClipboard(shareText);
      setShareStatus('Membuka Aplikasi WhatsApp (ringkasan & link berita disalin ke Clipboard).');
    }
    window.setTimeout(() => setShareStatus(null), 7000);
  };

  const handleShareWhatsAppWeb = async (article: JournalArticle) => {
    // Open guided WhatsApp Web (+1 Foto Utama) modal so PC/Laptop Admin clearly sees the 1 Foto Utama
    // copied to clipboard and knows to press Ctrl+V right inside WhatsApp Web before pressing Send!
    setWaWebShareModal({
      article,
      previewDataUrl: article.photos[0] || null,
      copyState: article.photos[0] ? 'preparing' : 'needs_manual',
    });

    if (!article.photos[0]) return;

    const canvas = await createShareablePhotoCanvas(article.photos[0], article.judul);
    const previewUrl = canvas ? canvas.toDataURL('image/jpeg', 0.88) : article.photos[0];

    let copyState: 'copied' | 'needs_manual' = 'needs_manual';
    if (
      canvas &&
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      'write' in navigator.clipboard &&
      typeof ClipboardItem !== 'undefined'
    ) {
      try {
        const pngBlob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob((b) => resolve(b), 'image/png')
        );
        if (pngBlob) {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
          copyState = 'copied';
        }
      } catch {
        copyState = 'needs_manual';
      }
    }

    setWaWebShareModal((prev) =>
      prev && prev.article.id === article.id
        ? { ...prev, previewDataUrl: previewUrl, copyState }
        : prev
    );
  };

  const handleLaunchWhatsAppWebFromModal = async (article: JournalArticle) => {
    const shareText = buildWhatsAppShareText(article);
    const waWebUrl = `https://web.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;

    // Copy 1 Foto Utama synchronously inside the click gesture so Chrome/Edge guarantees clipboard write
    if (article.photos[0]) {
      const result = await copyMainPhotoToClipboard(article.photos[0], article.judul);
      setWaWebShareModal((prev) =>
        prev && prev.article.id === article.id
          ? { ...prev, copyState: result === 'copied' ? 'copied' : 'needs_manual' }
          : prev
      );
    }

    const a = document.createElement('a');
    a.href = waWebUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  };

  const handleDownloadMainPhoto = async (article: JournalArticle) => {
    if (!article.photos[0]) return;
    const file = await createShareablePhotoFile(article.photos[0], article.judul);
    if (!file) {
      setShareStatus('Gagal menyiapkan file unduhan Foto Utama.');
      window.setTimeout(() => setShareStatus(null), 3500);
      return;
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = `foto-utama-${article.id}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    setShareStatus('✓ 1 Foto Utama (.JPG) berhasil diunduh — siap dilampirkan di WhatsApp Web!');
    window.setTimeout(() => setShareStatus(null), 4500);
  };

  const handleCopyMainPhoto = async (article: JournalArticle) => {
    if (!article.photos[0]) return;
    const result = await copyMainPhotoToClipboard(article.photos[0], article.judul);
    if (result === 'copied') {
      triggerCopiedBadge(
        `photo-${article.id}`,
        '✓ 1 Foto Utama tersalin! Tempel (Ctrl + V) langsung di kolom chat WhatsApp Web.'
      );
    } else if (result === 'downloaded') {
      triggerCopiedBadge(
        `photo-${article.id}`,
        '✓ 1 Foto Utama berhasil diunduh untuk dilampirkan di WhatsApp Web.'
      );
    } else {
      setShareStatus('Gagal menyalin Foto Utama. Silakan klik kanan pada foto lalu pilih Salin Gambar.');
      window.setTimeout(() => setShareStatus(null), 4000);
    }
  };

  const handleCopyArticleLink = async (article: JournalArticle) => {
    const url = getArticleShareUrl(article.id);
    const copied = await copyTextToClipboard(url);
    if (copied) {
      triggerCopiedBadge(`link-${article.id}`, 'Link langsung berita berhasil disalin ke Clipboard!');
    } else {
      setShareStatus(url);
    }
  };

  const handleCopyArticleWaText = async (article: JournalArticle) => {
    const shareText = buildWhatsAppShareText(article);
    const copied = await copyTextToClipboard(shareText);
    if (copied) {
      triggerCopiedBadge(
        `text-${article.id}`,
        'Redaksi lengkap & link berita tersalin! Siap ditempel (Ctrl+V) di WhatsApp Web atau grup.'
      );
    } else {
      setShareStatus(getArticleShareUrl(article.id));
    }
  };

  const handlePhotoUploadForSlot = async (
    slotIndex: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompressingSlot(slotIndex);
    try {
      const compressed = await compressBannerImageFile(file, 1200, 0.8);
      setPhotoSlots((prev) => {
        const next: [string, string, string, string] = [...prev] as [
          string,
          string,
          string,
          string,
        ];
        next[slotIndex] = compressed.dataUrl;
        return next;
      });
    } catch {
      setFormNotice('Gagal memproses file foto. Gunakan format JPG/PNG/WebP.');
    } finally {
      setCompressingSlot(null);
    }
  };

  const openCreateModal = () => {
    setEditingArticleId(null);
    setJudul('');
    setKategoriLokasi('TOJO UNA UNA');
    setPenulis('');
    setSatker(satkerList[0] || 'Kantor Kemenag Kab. Tojo Una-Una (Induk)');
    const now = new Date();
    const formattedDate =
      now.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }) +
      ' - ' +
      now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      }) +
      ' WITA';
    setTanggalWaktu(formattedDate);
    setLeadParagraf('HUMAS, TOJO UNA UNA – ');
    setIsiBerita('');
    setCaptionFotoUtama('');
    setPhotoSlots(['', '', '', '']);
    setFormNotice(null);
    setShowWriteModal(true);
  };

  const openEditModal = (article: JournalArticle) => {
    setEditingArticleId(article.id);
    setJudul(article.judul);
    setKategoriLokasi(article.kategoriLokasi || 'TOJO UNA UNA');
    setPenulis(article.penulis);
    setSatker(article.satker);
    setTanggalWaktu(article.tanggalWaktu);
    setLeadParagraf(article.leadParagraf);
    setIsiBerita(article.isiBerita);
    setCaptionFotoUtama(article.captionFotoUtama || '');
    setPhotoSlots([
      article.photos[0] || '',
      article.photos[1] || '',
      article.photos[2] || '',
      article.photos[3] || '',
    ]);
    setFormNotice(null);
    setShowWriteModal(true);
  };

  const handleSubmitJournal = (e: React.FormEvent) => {
    e.preventDefault();
    const validPhotos = photoSlots
      .map((p) => normalizeBannerImageUrl(p.trim()))
      .filter(Boolean);

    if (!judul.trim()) {
      setFormNotice('Judul Berita / Jurnal wajib diisi.');
      return;
    }
    if (!penulis.trim()) {
      setFormNotice('Nama Penulis / Kontributor wajib diisi.');
      return;
    }
    if (validPhotos.length === 0) {
      setFormNotice('Minimal Foto Utama (Foto #1) wajib diunggah atau diisi link gambarnya.');
      return;
    }

    if (editingArticleId) {
      onUpdateJournal(editingArticleId, {
        judul: judul.trim(),
        kategoriLokasi: kategoriLokasi.trim() || 'TOJO UNA UNA',
        penulis: penulis.trim(),
        satker,
        tanggalWaktu: tanggalWaktu.trim(),
        leadParagraf: leadParagraf.trim(),
        isiBerita: isiBerita.trim(),
        photos: validPhotos,
        captionFotoUtama: captionFotoUtama.trim() || undefined,
      });
      onSelectJournalId(editingArticleId);
    } else {
      const newId = `jrn-${Date.now()}`;
      const newArticle: JournalArticle = {
        id: newId,
        judul: judul.trim(),
        kategoriLokasi: kategoriLokasi.trim() || 'TOJO UNA UNA',
        penulis: penulis.trim(),
        satker,
        tanggalWaktu:
          tanggalWaktu.trim() ||
          new Date().toLocaleDateString('id-ID', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          }) + ' WITA',
        leadParagraf: leadParagraf.trim(),
        isiBerita: isiBerita.trim(),
        photos: validPhotos,
        captionFotoUtama: captionFotoUtama.trim() || undefined,
        disetujui: true,
      };
      onAddJournal(newArticle);
      onSelectJournalId(newId);
    }

    setShowWriteModal(false);
    setViewMode('reader');
  };

  const handleUnlockPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === adminPin) {
      onUnlockAdmin();
      setShowPinModal(false);
      setPinInput('');
      setPinError(null);
    } else {
      setPinError('PIN Admin tidak sesuai.');
    }
  };

  const bodyParagraphs = (activeArticle?.isiBerita || '')
    .split(/\n\s*\n|\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-20">
      {/* Dedicated Journal Top Action Bar (Distraction-Free Editorial Header) */}
      <div className="bg-[#021b15] text-white border-b border-emerald-800 px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToPortal}
              className="px-3 py-1.5 rounded-lg bg-[#03251c] hover:bg-emerald-900 border border-emerald-700 text-emerald-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-amber-300" />
              <span>Beranda Portal 3D</span>
            </button>

            <div className="h-4 w-px bg-emerald-800 hidden sm:block" />

            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span className="font-display text-sm font-bold text-amber-300 tracking-wide">
                JURNAL & BERITA RESMI HAB KE-81
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode(viewMode === 'list' ? 'reader' : 'list')}
              className="px-3 py-1.5 rounded-lg bg-[#03251c] hover:bg-emerald-900 border border-emerald-700 text-xs font-semibold text-slate-200 cursor-pointer"
            >
              {viewMode === 'list'
                ? 'Baca Berita Terpilih'
                : `Semua Daftar Jurnal (${approvedJournals.length})`}
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              className="px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Tulis Jurnal / Berita (1–4 Foto)</span>
            </button>

            {!isAdminUnlocked ? (
              <button
                type="button"
                onClick={() => setShowPinModal(true)}
                className="px-2.5 py-1.5 rounded-lg bg-[#03251c] border border-emerald-800 text-slate-300 hover:text-amber-300 text-xs flex items-center gap-1 cursor-pointer"
                title="Buka Mode Edit/Hapus Admin"
              >
                <Lock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            ) : (
              <span className="px-2.5 py-1 rounded bg-emerald-900/90 border border-amber-400/50 text-amber-300 text-[11px] font-bold flex items-center gap-1">
                <Unlock className="w-3 h-3" />
                <span>Mode Admin Aktif</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Share Notification Toast */}
      {shareStatus && (
        <div className="bg-emerald-900 text-amber-200 px-4 py-2.5 text-xs font-bold text-center border-b border-emerald-700">
          {shareStatus}
        </div>
      )}

      {/* MAIN CONTENT AREA: DISTRACTION-FREE JOURNAL READER OR ARTICLE INDEX */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Global Journal Search Bar (Accessible in both Reader & List views) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              aria-label="Cari artikel berita berdasarkan kata kunci atau judul"
              value={searchQuery}
              onChange={(e) => {
                const nextVal = e.target.value;
                setSearchQuery(nextVal);
                if (nextVal.trim() && viewMode !== 'list') {
                  setViewMode('list');
                }
              }}
              placeholder="Cari judul berita, kata kunci, penulis, atau Satker..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Hapus kata kunci pencarian"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 text-xs text-slate-500">
            {searchQuery.trim() ? (
              <span className="font-semibold text-emerald-800">
                Ditemukan {filteredJournals.length} dari {approvedJournals.length} berita
              </span>
            ) : (
              <span>{approvedJournals.length} Artikel Terbit</span>
            )}
          </div>
        </div>

        {viewMode === 'list' ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900">
                  Indeks Jurnal & Berita Kegiatan HAB ke-81
                </h1>
                <p className="text-[8px] font-normal tracking-wide text-slate-400/60 uppercase mt-0.5 select-none">
                  by HUMAS KEMENTERIAN AGAMA KABUPATEN TOJO UNA UNA
                </p>
              </div>
              <button
                type="button"
                onClick={openCreateModal}
                className="px-4 py-2 rounded-lg bg-[#065f46] hover:bg-[#047857] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Terbitkan Berita Baru</span>
              </button>
            </div>

            {filteredJournals.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
                <Search className="w-9 h-9 text-slate-300 mx-auto" />
                <h2 className="text-base font-bold text-slate-900">
                  Artikel Berita Tidak Ditemukan
                </h2>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  {searchQuery.trim()
                    ? `Tidak ada jurnal atau berita yang cocok dengan kata kunci "${searchQuery.trim()}". Coba gunakan kata kunci lain.`
                    : 'Belum ada artikel jurnal yang diterbitkan.'}
                </p>
                {searchQuery.trim() && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs cursor-pointer"
                  >
                    Tampilkan Semua Berita
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredJournals.map((item) => (
                <article
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div
                      onClick={() => {
                        onSelectJournalId(item.id);
                        setViewMode('reader');
                      }}
                      className="aspect-video bg-slate-100 overflow-hidden cursor-pointer relative"
                    >
                      <img
                        src={item.photos[0]}
                        alt={item.judul}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded bg-rose-700 text-white text-[10px] font-extrabold uppercase tracking-wider">
                        {item.kategoriLokasi || 'TOJO UNA UNA'}
                      </span>
                      {item.photos.length > 1 && (
                        <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded bg-black/75 text-white text-[10px] font-semibold">
                          {item.photos.length} Foto
                        </span>
                      )}
                    </div>

                    <div className="p-5 space-y-2.5">
                      <div className="text-[11px] text-slate-500 font-medium">
                        {item.tanggalWaktu} · Oleh:{' '}
                        <strong className="text-slate-800">{item.penulis}</strong>
                      </div>
                      <h2
                        onClick={() => {
                          onSelectJournalId(item.id);
                          setViewMode('reader');
                        }}
                        className="text-lg font-extrabold text-slate-900 hover:text-emerald-800 cursor-pointer leading-snug line-clamp-3"
                      >
                        {item.judul}
                      </h2>
                      <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                        {item.leadParagraf}
                      </p>
                    </div>
                  </div>

                  <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectJournalId(item.id);
                        setViewMode('reader');
                      }}
                      className="text-xs font-bold text-emerald-800 hover:text-emerald-600 cursor-pointer"
                    >
                      Baca Selengkapnya →
                    </button>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => void handleShareWhatsAppWithPhoto(item)}
                        title="Bagikan via Aplikasi WhatsApp / HP (dengan Foto Utama)"
                        className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Share2 className="w-3 h-3" />
                        <span>WA App</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleShareWhatsAppWeb(item)}
                        title="Bagikan langsung melalui WhatsApp Web di browser Laptop/PC"
                        className="px-2 py-1 rounded-lg bg-teal-700 hover:bg-teal-600 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Globe className="w-3 h-3" />
                        <span>WA Web</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleCopyArticleLink(item)}
                        title="Salin link berita untuk ditempel manual"
                        className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        {copiedShareKey === `link-${item.id}` ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700">Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Salin Link</span>
                          </>
                        )}
                      </button>
                      {isAdminUnlocked && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="p-1.5 rounded bg-amber-100 text-amber-800 hover:bg-amber-200 cursor-pointer"
                            title="Edit Berita"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteJournal(item.id)}
                            className="p-1.5 rounded bg-rose-100 text-rose-700 hover:bg-rose-200 cursor-pointer"
                            title="Hapus Berita"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              ))}
              </div>
            )}
          </div>
        ) : activeArticle ? (
          /* ===================================================================
             EDITORIAL NEWS READER VIEW (MATCHING SCREENSHOTS 1 & 2)
             =================================================================== */
          <article className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-10 space-y-6">
            {/* Breadcrumb: 🏠 > BERITA > TOJO UNA UNA */}
            <nav
              aria-label="Breadcrumb Berita"
              className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold tracking-wider uppercase"
            >
              <div className="flex items-center gap-2 text-rose-700">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="hover:underline flex items-center gap-1 cursor-pointer"
                  title="Lihat Semua Berita"
                >
                  <Home className="w-3.5 h-3.5" />
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="hover:underline cursor-pointer"
                >
                  BERITA
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span>{activeArticle.kategoriLokasi || 'TOJO UNA UNA'}</span>
              </div>

              {isAdminUnlocked && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(activeArticle)}
                    className="px-3 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Berita Ini</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteJournal(activeArticle.id);
                      setViewMode('list');
                    }}
                    className="px-3 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                </div>
              )}
            </nav>

            {/* Main Article Headline */}
            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 leading-[1.2] tracking-tight">
              {activeArticle.judul}
            </h1>

            {/* Dateline, Author & WhatsApp Share Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
              <div className="space-y-1 text-sm text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{activeArticle.tanggalWaktu}</span>
                </div>
                <div>
                  Oleh : <strong className="font-bold text-slate-900">{activeArticle.penulis}</strong>
                  {activeArticle.satker && (
                    <span className="text-xs text-slate-500 ml-1.5">
                      ({activeArticle.satker})
                    </span>
                  )}
                </div>
              </div>

              {/* WhatsApp Share Buttons: Aplikasi WA (HP/Desktop App), WhatsApp Web (Browser PC), & Salin Link Manual */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleShareWhatsAppWithPhoto(activeArticle)}
                  title="Bagikan lewat Aplikasi WhatsApp / HP (ikut melampirkan Foto Utama di HP)"
                  className="px-3.5 py-2 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WA Aplikasi / HP</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleShareWhatsAppWeb(activeArticle)}
                  title="Buka WhatsApp Web & otomatis salin 1 Foto Utama (tinggal tekan Ctrl+V di WhatsApp Web)"
                  className="px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>WhatsApp Web (+1 Foto Utama)</span>
                </button>
                {activeArticle.photos[0] && (
                  <button
                    type="button"
                    onClick={() => void handleCopyMainPhoto(activeArticle)}
                    title="Salin 1 Foto Utama berita agar bisa ditempel (Ctrl+V) langsung ke WhatsApp Web"
                    className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedShareKey === `photo-${activeArticle.id}` ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Foto Disalin (Ctrl+V)!</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Salin Foto Utama</span>
                      </>
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void handleCopyArticleLink(activeArticle)}
                  title="Salin link berita langsung ke Clipboard"
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedShareKey === `link-${activeArticle.id}` ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Link Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Link2 className="w-3.5 h-3.5" />
                      <span>Salin Link</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => void handleCopyArticleWaText(activeArticle)}
                  title="Salin judul, ringkasan, dan link berita untuk ditempel manual ke WhatsApp Web"
                  className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedShareKey === `text-${activeArticle.id}` ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Teks &amp; Link Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Teks &amp; Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* FOTO UTAMA (Photo #1) */}
            {activeArticle.photos[0] && (
              <figure className="space-y-2">
                <div
                  onClick={() => setLightboxImage(activeArticle.photos[0])}
                  className="rounded-xl overflow-hidden bg-slate-100 border border-slate-200 cursor-zoom-in"
                >
                  <img
                    src={activeArticle.photos[0]}
                    alt={activeArticle.judul}
                    className="w-full max-h-[540px] object-cover"
                  />
                </div>
                {activeArticle.captionFotoUtama && (
                  <figcaption className="text-xs text-slate-500 italic">
                    {activeArticle.captionFotoUtama}
                  </figcaption>
                )}
              </figure>
            )}

            {/* LEAD PARAGRAPH (Bold + Italic just like screenshot #2) */}
            {activeArticle.leadParagraf && (
              <p className="text-base sm:text-lg font-bold italic text-slate-900 leading-relaxed">
                {activeArticle.leadParagraf}
              </p>
            )}

            {/* FOTO KE-2 (Placed right after Lead Paragraph, matching screenshot #2) */}
            {activeArticle.photos[1] && (
              <figure className="my-6">
                <div
                  onClick={() => setLightboxImage(activeArticle.photos[1])}
                  className="rounded-xl overflow-hidden bg-slate-100 border border-slate-200 cursor-zoom-in"
                >
                  <img
                    src={activeArticle.photos[1]}
                    alt={`${activeArticle.judul} - Dokumentasi 2`}
                    className="w-full max-h-[520px] object-cover"
                  />
                </div>
              </figure>
            )}

            {/* ARTICLE BODY PARAGRAPHS */}
            <div className="space-y-4 text-base sm:text-[17px] text-slate-800 leading-[1.8]">
              {bodyParagraphs.map((para, idx) => (
                <p key={idx}>{para}</p>
              ))}
            </div>

            {/* FOTO KE-3 & FOTO KE-4 (Additional Documentation Grid if uploaded) */}
            {activeArticle.photos.length > 2 && (
              <div className="pt-4 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Dokumentasi Foto Tambahan
                </div>
                <div
                  className={`grid grid-cols-1 ${
                    activeArticle.photos.length === 4 ? 'sm:grid-cols-2' : ''
                  } gap-4`}
                >
                  {activeArticle.photos.slice(2, 4).map((photoUrl, idx) => (
                    <div
                      key={idx}
                      onClick={() => setLightboxImage(photoUrl)}
                      className="rounded-xl overflow-hidden bg-slate-100 border border-slate-200 cursor-zoom-in"
                    >
                      <img
                        src={photoUrl}
                        alt={`${activeArticle.judul} - Dokumentasi ${idx + 3}`}
                        className="w-full max-h-[380px] object-cover hover:scale-102 transition-transform"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Article Footer, Manual Copyable Link Box & WhatsApp Share (App + Web) */}
            <div className="pt-6 border-t border-slate-200 space-y-4">
              {/* Direct Selectable Link Strip for Laptop/PC Manual Copy */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide shrink-0 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Link Berita:</span>
                </span>
                <input
                  type="text"
                  readOnly
                  value={getArticleShareUrl(activeArticle.id)}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-mono text-slate-800 focus:outline-none focus:border-emerald-600"
                />
                <button
                  type="button"
                  onClick={() => void handleCopyArticleLink(activeArticle)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                >
                  {copiedShareKey === `link-${activeArticle.id}` ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-amber-300" />
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Link</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-[8px] font-normal tracking-wide text-slate-400/60 uppercase select-none">
                  by HUMAS KEMENTERIAN AGAMA KABUPATEN TOJO UNA UNA
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleCopyArticleWaText(activeArticle)}
                    className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedShareKey === `text-${activeArticle.id}` ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Teks &amp; Link Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Teks &amp; Link</span>
                      </>
                    )}
                  </button>
                  {activeArticle.photos[0] && (
                    <button
                      type="button"
                      onClick={() => void handleCopyMainPhoto(activeArticle)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedShareKey === `photo-${activeArticle.id}` ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Foto Disalin (Ctrl+V)!</span>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>Salin 1 Foto Utama</span>
                        </>
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleShareWhatsAppWeb(activeArticle)}
                    className="px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>WhatsApp Web (+1 Foto Utama)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleShareWhatsAppWithPhoto(activeArticle)}
                    className="px-3.5 py-2 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Bagikan via Aplikasi WA</span>
                  </button>
                </div>
              </div>
            </div>
          </article>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
            <BookOpen className="w-10 h-10 text-emerald-700 mx-auto" />
            <h2 className="text-lg font-bold text-slate-900">Belum Ada Artikel Jurnal</h2>
            <p className="text-xs text-slate-600">
              Silakan klik tombol <strong>+ Tulis Jurnal / Berita (1–4 Foto)</strong> di atas untuk menerbitkan liputan pertama.
            </p>
          </div>
        )}

        {/* Other Recent Journals Strip below Reader */}
        {viewMode === 'reader' && approvedJournals.length > 1 && (
          <div className="mt-10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-wide">
                Berita & Jurnal Lainnya
              </h3>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="text-xs font-bold text-emerald-800 hover:underline cursor-pointer"
              >
                Lihat Semua ({approvedJournals.length}) →
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {approvedJournals
                .filter((j) => j.id !== activeArticle?.id)
                .slice(0, 4)
                .map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      onSelectJournalId(item.id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="bg-white rounded-xl border border-slate-200 p-3.5 flex gap-3.5 items-center hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <img
                      src={item.photos[0]}
                      alt={item.judul}
                      className="w-24 h-20 rounded-lg object-cover shrink-0 bg-slate-100"
                    />
                    <div className="min-w-0 space-y-1">
                      <span className="text-[10px] font-bold text-rose-700 uppercase">
                        {item.kategoriLokasi || 'TOJO UNA UNA'}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug">
                        {item.judul}
                      </h4>
                      <div className="text-[11px] text-slate-500 truncate">
                        {item.tanggalWaktu}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================
          MODAL FORM: TULIS / EDIT JURNAL BERITA (MENDUKUNG 1 S/D 4 FOTO)
         =================================================================== */}
      {showWriteModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div className="bg-[#03251c] text-slate-100 border-2 border-amber-400/70 rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-[#021b15] border-b border-emerald-800 flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">
                  {editingArticleId
                    ? 'Edit Artikel Jurnal & Berita'
                    : 'Tulis & Terbitkan Jurnal Berita Baru (1–4 Foto)'}
                </h2>
                <p className="text-xs text-emerald-300">
                  Foto #1 otomatis menjadi Foto Utama saat link dibagikan ke WhatsApp
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowWriteModal(false)}
                className="p-1.5 rounded-lg bg-emerald-900/80 text-slate-200 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitJournal} className="p-6 overflow-y-auto space-y-4 text-xs">
              {formNotice && (
                <div className="p-3 rounded-lg bg-rose-950 border border-rose-500/60 text-rose-200 font-semibold">
                  {formNotice}
                </div>
              )}

              <div>
                <label className="block font-bold text-amber-300 mb-1">
                  Judul Utama Berita / Jurnal *
                </label>
                <input
                  type="text"
                  value={judul}
                  onChange={(e) => setJudul(e.target.value)}
                  placeholder="Contoh: Kemenag Tojo Una-Una Matangkan Persiapan HAB ke-81 Tahun 2027..."
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#021b15] border border-emerald-700 text-sm text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-200 mb-1">
                    Nama Penulis / Humas *
                  </label>
                  <input
                    type="text"
                    value={penulis}
                    onChange={(e) => setPenulis(e.target.value)}
                    placeholder="Contoh: H. Sam Asiku"
                    className="w-full px-3 py-2 rounded-lg bg-[#021b15] border border-emerald-700 text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-200 mb-1">
                    Label Wilayah / Kategori Atas
                  </label>
                  <input
                    type="text"
                    value={kategoriLokasi}
                    onChange={(e) => setKategoriLokasi(e.target.value)}
                    placeholder="TOJO UNA UNA"
                    className="w-full px-3 py-2 rounded-lg bg-[#021b15] border border-emerald-700 text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-200 mb-1">
                    Hari, Tanggal & Jam (WITA)
                  </label>
                  <input
                    type="text"
                    value={tanggalWaktu}
                    onChange={(e) => setTanggalWaktu(e.target.value)}
                    placeholder="Kamis, 05 November 2026 - 14:54 WITA"
                    className="w-full px-3 py-2 rounded-lg bg-[#021b15] border border-emerald-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-200 mb-1">
                    Satuan Kerja (Satker)
                  </label>
                  <select
                    value={satker}
                    onChange={(e) => setSatker(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#021b15] border border-emerald-700 text-white"
                  >
                    {satkerList.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-200 mb-1">
                    Keterangan Foto Utama (Opsional)
                  </label>
                  <input
                    type="text"
                    value={captionFotoUtama}
                    onChange={(e) => setCaptionFotoUtama(e.target.value)}
                    placeholder="Keterangan singkat di bawah Foto Utama..."
                    className="w-full px-3 py-2 rounded-lg bg-[#021b15] border border-emerald-700 text-white"
                  />
                </div>
              </div>

              {/* 4 Photo Upload / URL Slots */}
              <div className="bg-[#021b15] border border-emerald-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4" />
                    <span>Upload 1 s/d 4 Foto Berita (Otomatis Dikompresi / Link URL)</span>
                  </span>
                  <span className="text-[11px] text-emerald-300">
                    Foto #1 = Foto Utama Share WA · Foto #2 = Tengah Berita
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[0, 1, 2, 3].map((slotIdx) => (
                    <div
                      key={slotIdx}
                      className="bg-[#03251c] border border-emerald-800/80 rounded-lg p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">
                          {slotIdx === 0
                            ? 'Foto #1 (Foto Utama & Share WA) *'
                            : slotIdx === 1
                            ? 'Foto #2 (Tengah Artikel)'
                            : `Foto #${slotIdx + 1} (Dokumentasi Tambahan)`}
                        </span>
                        {photoSlots[slotIdx] && (
                          <button
                            type="button"
                            onClick={() =>
                              setPhotoSlots((prev) => {
                                const next: [string, string, string, string] = [...prev] as [
                                  string,
                                  string,
                                  string,
                                  string,
                                ];
                                next[slotIdx] = '';
                                return next;
                              })
                            }
                            className="text-[11px] text-rose-400 hover:underline cursor-pointer"
                          >
                            Hapus Foto
                          </button>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <label className="px-3 py-1.5 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[11px] flex items-center gap-1 cursor-pointer shrink-0">
                          <Upload className="w-3.5 h-3.5" />
                          <span>
                            {compressingSlot === slotIdx ? 'Memproses...' : 'Upload Foto'}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => void handlePhotoUploadForSlot(slotIdx, e)}
                            className="hidden"
                          />
                        </label>
                        <input
                          type="text"
                          value={
                            photoSlots[slotIdx].startsWith('data:')
                              ? ''
                              : photoSlots[slotIdx]
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            setPhotoSlots((prev) => {
                              const next: [string, string, string, string] = [...prev] as [
                                string,
                                string,
                                string,
                                string,
                              ];
                              next[slotIdx] = val;
                              return next;
                            });
                          }}
                          placeholder="Atau tempel Link URL Gambar..."
                          className="flex-1 px-2.5 py-1.5 rounded bg-[#021b15] border border-emerald-700 text-[11px] text-white"
                        />
                      </div>

                      {photoSlots[slotIdx] && (
                        <img
                          src={normalizeBannerImageUrl(photoSlots[slotIdx])}
                          alt={`Pratinjau Foto ${slotIdx + 1}`}
                          className="w-full h-24 object-cover rounded border border-emerald-700"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-amber-300 mb-1">
                  Paragraf Pembuka / Lead Berita (Tampil Cetak Tebal & Miring setelah Foto #1) *
                </label>
                <textarea
                  rows={3}
                  value={leadParagraf}
                  onChange={(e) => setLeadParagraf(e.target.value)}
                  placeholder="Contoh: HUMAS, TOJO UNA UNA – Kantor Kementerian Agama (Kemenag) Kabupaten Tojo Una-Una mulai bergerak cepat..."
                  className="w-full px-3.5 py-2 rounded-lg bg-[#021b15] border border-emerald-700 text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-amber-300 mb-1">
                  Isi Berita Lengkap (Pisahkan antar paragraf dengan baris baru / Enter) *
                </label>
                <textarea
                  rows={7}
                  value={isiBerita}
                  onChange={(e) => setIsiBerita(e.target.value)}
                  placeholder="Ketik isi berita lengkap di sini..."
                  className="w-full px-3.5 py-2 rounded-lg bg-[#021b15] border border-emerald-700 text-white leading-relaxed"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowWriteModal(false)}
                  className="px-4 py-2 rounded-lg bg-emerald-950 text-slate-300 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {editingArticleId ? 'Simpan Perubahan Berita' : 'Terbitkan Jurnal Sekarang'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Zoom Modal */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <img
            src={lightboxImage}
            alt="Zoom Dokumentasi Jurnal"
            className="max-w-full max-h-[90vh] rounded-xl shadow-2xl"
          />
        </div>
      )}

      {/* Admin PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <form
            onSubmit={handleUnlockPinSubmit}
            className="bg-[#03251c] border border-amber-400/60 rounded-2xl p-6 max-w-sm w-full space-y-4 text-white"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-amber-300">
                Masukkan PIN Admin Jurnal
              </h3>
              <button
                type="button"
                onClick={() => setShowPinModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {pinError && <div className="text-xs text-rose-300">{pinError}</div>}
            <input
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="PIN Admin"
              className="w-full px-3.5 py-2 rounded-lg bg-[#021b15] border border-emerald-700 text-sm text-center text-white"
            />
            <button
              type="submit"
              className="w-full py-2 rounded-lg bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
            >
              Buka Akses Edit & Hapus
            </button>
          </form>
        </div>
      )}

      {/* Guided WhatsApp Web (+1 Foto Utama) Share Modal for PC/Laptop */}
      {waWebShareModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#03251c] border-2 border-emerald-400/70 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl text-white">
            <div className="px-5 py-3.5 bg-[#021b15] border-b border-emerald-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-amber-300">
                  Bagikan ke WhatsApp Web (+1 Foto Utama)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setWaWebShareModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Live 1 Foto Utama Preview */}
              {waWebShareModal.previewDataUrl && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-emerald-300 uppercase tracking-wide flex items-center justify-between">
                    <span>Pratinjau 1 Foto Utama yang Akan Tampil di WA:</span>
                    {waWebShareModal.copyState === 'copied' && (
                      <span className="text-amber-300 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        Tersalin di Clipboard
                      </span>
                    )}
                  </div>
                  <div className="rounded-xl overflow-hidden border border-emerald-700 bg-[#021b15]">
                    <img
                      src={waWebShareModal.previewDataUrl}
                      alt={waWebShareModal.article.judul}
                      className="w-full max-h-52 object-cover"
                    />
                  </div>
                </div>
              )}

              {/* Clear 2-Step Instructions so Foto Utama ALWAYS appears in WhatsApp Web */}
              <div className="p-3.5 rounded-xl bg-[#021b15] border border-amber-400/40 space-y-2 text-xs">
                <div className="font-bold text-amber-300">
                  Cara Menampilkan 1 Foto Utama + Teks Berita di WhatsApp Web:
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-200 leading-relaxed">
                  <li>
                    Klik tombol <strong className="text-emerald-300">Buka WhatsApp Web</strong> di bawah
                    (teks judul, ringkasan &amp; link berita otomatis masuk ke kolom chat).
                  </li>
                  <li>
                    Setelah memilih grup/kontak di WhatsApp Web, tekan{' '}
                    <kbd className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-extrabold text-[11px]">
                      Ctrl + V
                    </kbd>{' '}
                    di kolom ketik <strong>sebelum menekan Kirim</strong> — 1 Foto Utama akan langsung
                    menempel menggantikan logo default!
                  </li>
                </ol>
                {waWebShareModal.copyState === 'needs_manual' && (
                  <p className="text-[11px] text-amber-200 pt-1 border-t border-emerald-900">
                    Tip: Jika Ctrl+V belum menempelkan gambar di browser Anda, klik{' '}
                    <strong>Salin 1 Foto Utama</strong> atau <strong>Unduh Foto (.JPG)</strong> di bawah lalu
                    seret/lampirkan ke chat WhatsApp Web.
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => void handleLaunchWhatsAppWebFromModal(waWebShareModal.article)}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                >
                  <Globe className="w-4 h-4" />
                  <span>1. Salin Foto Utama &amp; Buka WhatsApp Web →</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => void handleCopyMainPhoto(waWebShareModal.article)}
                    className="py-2 px-3 rounded-xl bg-[#021b15] hover:bg-emerald-900 border border-emerald-700 text-emerald-200 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copiedShareKey === `photo-${waWebShareModal.article.id}` ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-amber-300" />
                        <span className="text-amber-300">Foto Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Salin Ulang Foto Utama</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDownloadMainPhoto(waWebShareModal.article)}
                    className="py-2 px-3 rounded-xl bg-[#021b15] hover:bg-emerald-900 border border-amber-400/50 text-amber-200 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh Foto (.JPG)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
