import React, { useEffect, useState } from 'react';
import { JournalArticle } from '../types/hab';
import {
  compressBannerImageFile,
  normalizeBannerImageUrl,
} from '../utils/habLogic';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Check,
  ChevronRight,
  Copy,
  Edit3,
  ExternalLink,
  Home,
  Image as ImageIcon,
  Lock,
  Plus,
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
 * Converts an image URL or DataURL into a JPEG File object so mobile browsers
 * can share the actual Foto Utama image file + link directly to WhatsApp!
 */
async function createShareablePhotoFile(
  photoSrc: string,
  title: string
): Promise<File | null> {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = photoSrc;
    });

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
    const scale = Math.max(w / (img.naturalWidth || w), h / (img.naturalHeight || h));
    const dw = (img.naturalWidth || w) * scale;
    const dh = (img.naturalHeight || h) * scale;
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

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.88)
    );
    if (!blob) return null;
    return new File([blob], 'jurnal-kemenag-touna.jpg', { type: 'image/jpeg' });
  } catch {
    return null;
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
  const approvedJournals = journals.filter((j) => j.disetujui !== false);
  const activeArticle =
    approvedJournals.find((j) => j.id === selectedJournalId) ||
    approvedJournals[0] ||
    null;

  const [viewMode, setViewMode] = useState<'reader' | 'list'>(
    selectedJournalId ? 'reader' : 'reader'
  );
  const [showWriteModal, setShowWriteModal] = useState<boolean>(false);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);

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
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
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
    return `https://irfan45372.github.io/HABKEMENAGTOUNA/?jurnal=${encodeURIComponent(articleId)}`;
  };

  const buildWhatsAppShareText = (article: JournalArticle): string => {
    const url = getArticleShareUrl(article.id);
    const leadSnippet =
      article.leadParagraf.length > 200
        ? article.leadParagraf.slice(0, 200) + '...'
        : article.leadParagraf;
    return `*${article.judul}*\n📅 ${article.tanggalWaktu}\n✍️ Oleh: ${article.penulis}\n\n_${leadSnippet}_\n\n👉 *Baca selengkapnya & lihat dokumentasi foto di Jurnal Resmi HAB ke-81 Kemenag Tojo Una-Una:*\n${url}`;
  };

  const handleShareWhatsAppWithPhoto = async (article: JournalArticle) => {
    const shareText = buildWhatsAppShareText(article);
    const shareUrl = getArticleShareUrl(article.id);

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

    // 2. Fallback: Open WhatsApp click-to-chat with formatted headline, summary & direct link
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    const a = document.createElement('a');
    a.href = waUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();

    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setShareStatus('Tautan & ringkasan berita siap dibagikan ke WhatsApp!');
      window.setTimeout(() => setShareStatus(null), 4000);
    } catch {
      // Ignore clipboard error
    }
  };

  const handleCopyArticleLink = async (article: JournalArticle) => {
    const url = getArticleShareUrl(article.id);
    try {
      await navigator.clipboard.writeText(url);
      setShareStatus('Link langsung berita berhasil disalin ke Clipboard!');
      window.setTimeout(() => setShareStatus(null), 3500);
    } catch {
      setShareStatus(url);
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8">
        {viewMode === 'list' ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900">
                  Indeks Jurnal & Berita Kegiatan HAB ke-81
                </h1>
                <p className="text-xs text-slate-600 mt-0.5">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {approvedJournals.map((item) => (
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

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => void handleShareWhatsAppWithPhoto(item)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Share2 className="w-3 h-3" />
                        <span>Share WA</span>
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

              {/* WhatsApp Share Buttons (Foto Utama + Link Situs) */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleShareWhatsAppWithPhoto(activeArticle)}
                  className="px-4 py-2.5 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Bagikan ke WhatsApp (Foto Utama + Link)</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleCopyArticleLink(activeArticle)}
                  className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                  title="Salin Link Berita"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Link</span>
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

            {/* Bottom Article Footer & WhatsApp Share */}
            <div className="pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <div className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                by HUMAS KEMENTERIAN AGAMA KABUPATEN TOJO UNA UNA
              </div>
              <button
                type="button"
                onClick={() => void handleShareWhatsAppWithPhoto(activeArticle)}
                className="px-4 py-2 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white font-bold text-xs flex items-center gap-2 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Bagikan Berita Ini ke WhatsApp</span>
              </button>
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
    </div>
  );
};
