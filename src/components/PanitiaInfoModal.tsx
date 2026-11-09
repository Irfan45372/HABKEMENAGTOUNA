import React, { useEffect, useState } from 'react';
import { AnnouncementLetter, BrandingConfig, ScheduleEvent } from '../types/hab';
import { buildDeepLink, shareToWhatsAppWithFullImage } from '../utils/shareUtils';
import {
  createBlobUrlFromDataUrl,
  downloadGeneratedOfficialLetterDoc,
  formatAnnouncementWhatsAppText,
  getAnnouncementSnippetWords,
  getAnnouncementUrlSlug,
  getEmbeddableDocumentUrl,
  processUploadedLetterFile,
  renderAnnouncementWaCardCanvas,
} from '../utils/letterUtils';
import { Hab81LogoBadge, KemenagLogoImg } from './DynamicLogoBadge';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Check,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  FileText,
  Globe,
  Lock,
  Megaphone,
  Paperclip,
  Plus,
  Settings,
  Share2,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

interface PanitiaInfoModalProps {
  isOpen: boolean;
  isStandalonePage?: boolean;
  branding: BrandingConfig;
  schedules: ScheduleEvent[];
  adminPin?: string;
  isAdminUnlocked?: boolean;
  onUnlockAdmin?: () => void;
  onUpdateBranding?: (partial: Partial<BrandingConfig>) => void;
  onOpenAdminTab?: (tabIndex: number) => void;
  onClose: () => void;
  onOpenStandalonePage?: () => void;
  onJumpToSection: (sectionId: string) => void;
  onOpenJournal: () => void;
}

export const PanitiaInfoModal: React.FC<PanitiaInfoModalProps> = ({
  isOpen,
  isStandalonePage = false,
  branding,
  schedules,
  adminPin = '812027',
  isAdminUnlocked = false,
  onUnlockAdmin,
  onUpdateBranding,
  onOpenAdminTab,
  onClose,
  onOpenStandalonePage,
  onJumpToSection,
  onOpenJournal,
}) => {
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [pendingEditIdxAfterPin, setPendingEditIdxAfterPin] = useState<number | null>(null);
  const [showScheduleInStandalone, setShowScheduleInStandalone] = useState(false);

  // New Announcement + Optional Letter Upload State
  const [newAnnouncementText, setNewAnnouncementText] = useState('');
  const [showNewLetterForm, setShowNewLetterForm] = useState(false);
  const [newLetterDraft, setNewLetterDraft] = useState<Omit<
    AnnouncementLetter,
    'id' | 'waktuUpload'
  > | null>(null);
  const [newLetterNomor, setNewLetterNomor] = useState('');
  const [newLetterPerihal, setNewLetterPerihal] = useState('');
  const [newLetterExternalUrl, setNewLetterExternalUrl] = useState('');
  const [newLetterIsiTeks, setNewLetterIsiTeks] = useState('');
  const [newLetterNotice, setNewLetterNotice] = useState<string | null>(null);
  const [isUploadingNewLetter, setIsUploadingNewLetter] = useState(false);

  // Existing Announcement + Letter Edit State
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [editLetterDraft, setEditLetterDraft] = useState<AnnouncementLetter | null>(null);
  const [editLetterNomor, setEditLetterNomor] = useState('');
  const [editLetterPerihal, setEditLetterPerihal] = useState('');
  const [editLetterExternalUrl, setEditLetterExternalUrl] = useState('');
  const [editLetterIsiTeks, setEditLetterIsiTeks] = useState('');
  const [editLetterNotice, setEditLetterNotice] = useState<string | null>(null);
  const [isUploadingEditLetter, setIsUploadingEditLetter] = useState(false);

  // Active Letter Reader Modal State ("Baca Isi Surat")
  const [readingLetterState, setReadingLetterState] = useState<{
    announcementIndex: number;
    announcementText: string;
    letter: AnnouncementLetter;
  } | null>(null);
  const [activeBlobUrl, setActiveBlobUrl] = useState<string | null>(null);

  // Direct inline letter preview on the web page (auto-open when ?pengumuman= is visited)
  const [inlineLetterIndex, setInlineLetterIndex] = useState<number | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const num = parseInt(params.get('pengumuman') || '', 10);
      if (!Number.isNaN(num) && num >= 1) {
        return num - 1;
      }
      if (params.get('halaman') === 'pengumuman') {
        return 0;
      }
    } catch {
      // Ignore
    }
    return null;
  });
  const [inlineBlobUrl, setInlineBlobUrl] = useState<string | null>(null);

  const [saveNotice, setSaveNotice] = useState('');
  const [copiedLinkType, setCopiedLinkType] = useState<'official' | 'current' | number | null>(
    null
  );

  // Manage Blob URL lifecycle when user opens "Baca Isi Surat" for a PDF/Word DataURL
  useEffect(() => {
    if (!readingLetterState?.letter.fileDataUrl) {
      setActiveBlobUrl(null);
      return;
    }
    const blobUrl = createBlobUrlFromDataUrl(readingLetterState.letter.fileDataUrl);
    setActiveBlobUrl(blobUrl);
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [readingLetterState]);

  if (!isOpen && !isStandalonePage) return null;

  const announcements =
    branding.runningTextItems.length > 0
      ? branding.runningTextItems
      : [
          'Selamat Memperingati Hari Amal Bakti ke-81 Kementerian Agama Republik Indonesia — Kantor Kementerian Agama Kabupaten Tojo Una-Una Tahun 2027.',
        ];

  const announcementLetters: (AnnouncementLetter | null)[] = announcements.map(
    (_, idx) => branding.announcementLetters?.[idx] || null
  );

  // Manage Blob URL for inline PDF/Word viewer when inlineLetterIndex is active
  const activeInlineLetter =
    inlineLetterIndex !== null ? announcementLetters[inlineLetterIndex] || null : null;
  useEffect(() => {
    if (!activeInlineLetter?.fileDataUrl) {
      setInlineBlobUrl(null);
      return;
    }
    const blobUrl = createBlobUrlFromDataUrl(activeInlineLetter.fileDataUrl);
    setInlineBlobUrl(blobUrl);
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [activeInlineLetter?.fileDataUrl]);

  // Determine highlighted announcement index from URL (?pengumuman=1) or default to first (0)
  const highlightedAnnouncementIndex = (() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const num = parseInt(params.get('pengumuman') || '', 10);
      if (!Number.isNaN(num) && num >= 1 && num <= announcements.length) {
        return num - 1;
      }
    } catch {
      // Ignore
    }
    return 0;
  })();

  const primaryAnnouncementText = announcements[highlightedAnnouncementIndex] || announcements[0];
  const primaryRedaksiSlug = getAnnouncementUrlSlug(primaryAnnouncementText, 6);
  const primarySnippetWords = getAnnouncementSnippetWords(primaryAnnouncementText, 6);

  // Dedicated web URL specifically for Pengumuman Panitia Saja (includes 6-word redaksi slug)
  const officialStandaloneWebUrl = buildDeepLink({
    halaman: 'pengumuman',
    pengumuman: String(highlightedAnnouncementIndex + 1),
    redaksi: primaryRedaksiSlug,
  });
  const currentOriginStandaloneUrl = (() => {
    try {
      const url = new URL(window.location.href);
      url.search = '';
      url.hash = '';
      url.searchParams.set('halaman', 'pengumuman');
      url.searchParams.set('pengumuman', String(highlightedAnnouncementIndex + 1));
      url.searchParams.set('redaksi', primaryRedaksiSlug);
      return url.toString();
    } catch {
      return officialStandaloneWebUrl;
    }
  })();

  const triggerSavedNotice = (msg: string) => {
    setSaveNotice(msg);
    window.setTimeout(() => setSaveNotice(''), 4000);
  };

  const handleCopyText = async (text: string, type: 'official' | 'current' | number) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedLinkType(type);
    window.setTimeout(() => setCopiedLinkType(null), 3000);
  };

  const handleToggleManageMode = () => {
    if (isAdminUnlocked) {
      if (isManageOpen) {
        setEditingIndex(null);
        triggerSavedNotice('✓ Seluruh perubahan Pengumuman & Surat Panitia berhasil disimpan permanen!');
      }
      setIsManageOpen((prev) => !prev);
      setShowPinPrompt(false);
    } else {
      setPendingEditIdxAfterPin(null);
      setShowPinPrompt((prev) => !prev);
      setPinError('');
    }
  };

  const openEditorForAnnouncement = (idx: number, currentText: string) => {
    const existingLetter = announcementLetters[idx] || null;
    setEditingIndex(idx);
    setEditingText(currentText);
    setEditLetterDraft(existingLetter);
    setEditLetterNomor(existingLetter?.nomorSurat || '');
    setEditLetterPerihal(existingLetter?.perihalSurat || '');
    setEditLetterExternalUrl(existingLetter?.externalUrl || '');
    setEditLetterIsiTeks(existingLetter?.isiSuratTeks || '');
    setEditLetterNotice(null);
  };

  const handleRequestEditOrAttachLetter = (idx: number, currentText: string) => {
    if (isAdminUnlocked) {
      setIsManageOpen(true);
      openEditorForAnnouncement(idx, currentText);
    } else {
      setPendingEditIdxAfterPin(idx);
      setShowPinPrompt(true);
      setPinError('');
    }
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === adminPin) {
      onUnlockAdmin?.();
      setShowPinPrompt(false);
      setIsManageOpen(true);
      setPinInput('');
      setPinError('');
      if (pendingEditIdxAfterPin !== null && announcements[pendingEditIdxAfterPin] !== undefined) {
        openEditorForAnnouncement(pendingEditIdxAfterPin, announcements[pendingEditIdxAfterPin]);
        setPendingEditIdxAfterPin(null);
      }
    } else {
      setPinError('PIN Admin tidak sesuai.');
    }
  };

  // File upload handler for New Announcement Letter (.pdf, .docx, .doc)
  const handleNewLetterFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingNewLetter(true);
    setNewLetterNotice(null);
    try {
      const { letter, oversizeNotice } = await processUploadedLetterFile(file);
      setNewLetterDraft(letter);
      if (letter.isiSuratTeks) {
        setNewLetterIsiTeks(letter.isiSuratTeks);
      }
      if (!newLetterPerihal) {
        setNewLetterPerihal(file.name.replace(/\.(pdf|docx|doc)$/i, ''));
      }
      if (oversizeNotice) {
        setNewLetterNotice(oversizeNotice);
      } else {
        setNewLetterNotice(
          `✓ File surat "${file.name}" (${letter.fileSizeKb} KB) siap dilampirkan.` +
            (letter.isiSuratTeks ? ' Isi teks surat Word berhasil diekstrak otomatis!' : '')
        );
      }
    } catch {
      setNewLetterNotice('Gagal memproses file surat. Pastikan format file adalah .PDF, .DOCX, atau .DOC.');
    } finally {
      setIsUploadingNewLetter(false);
    }
  };

  // File upload handler for Editing Existing Announcement Letter (.pdf, .docx, .doc)
  const handleEditLetterFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingEditLetter(true);
    setEditLetterNotice(null);
    try {
      const { letter, oversizeNotice } = await processUploadedLetterFile(file);
      const nextLetter: AnnouncementLetter = {
        id: editLetterDraft?.id || `surat-${Date.now()}`,
        fileName: letter.fileName,
        fileType: letter.fileType,
        mimeType: letter.mimeType,
        fileSizeKb: letter.fileSizeKb,
        fileDataUrl: letter.fileDataUrl,
        waktuUpload: new Date().toLocaleString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      setEditLetterDraft(nextLetter);
      if (letter.isiSuratTeks) {
        setEditLetterIsiTeks(letter.isiSuratTeks);
      }
      if (!editLetterPerihal) {
        setEditLetterPerihal(file.name.replace(/\.(pdf|docx|doc)$/i, ''));
      }
      if (oversizeNotice) {
        setEditLetterNotice(oversizeNotice);
      } else {
        setEditLetterNotice(
          `✓ File surat "${file.name}" (${letter.fileSizeKb} KB) berhasil dimuat.` +
            (letter.isiSuratTeks ? ' Isi teks surat Word berhasil diekstrak otomatis!' : '')
        );
      }
    } catch {
      setEditLetterNotice('Gagal memproses file surat. Pastikan format file adalah .PDF, .DOCX, atau .DOC.');
    } finally {
      setIsUploadingEditLetter(false);
    }
  };

  const buildFinalLetterObject = (
    draft: Omit<AnnouncementLetter, 'id' | 'waktuUpload'> | AnnouncementLetter | null,
    nomor: string,
    perihal: string,
    externalUrl: string,
    isiTeks: string
  ): AnnouncementLetter | null => {
    const cleanNomor = nomor.trim();
    const cleanPerihal = perihal.trim();
    const cleanExtUrl = externalUrl.trim();
    const cleanIsi = isiTeks.trim();

    if (!draft && !cleanExtUrl && !cleanIsi) {
      return null;
    }

    const inferredType: 'pdf' | 'word' | 'link' = draft
      ? draft.fileType
      : cleanExtUrl.toLowerCase().endsWith('.docx') || cleanExtUrl.toLowerCase().endsWith('.doc')
      ? 'word'
      : cleanExtUrl.toLowerCase().endsWith('.pdf')
      ? 'pdf'
      : 'link';

    return {
      id: (draft && 'id' in draft && draft.id) || `surat-${Date.now()}`,
      fileName:
        draft?.fileName ||
        cleanPerihal ||
        (inferredType === 'pdf'
          ? 'Surat-Resmi-Panitia.pdf'
          : inferredType === 'word'
          ? 'Surat-Resmi-Panitia.docx'
          : 'Dokumen-Surat-Panitia'),
      fileType: inferredType,
      mimeType:
        draft?.mimeType ||
        (inferredType === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
      fileSizeKb: draft?.fileSizeKb,
      fileDataUrl: draft?.fileDataUrl,
      externalUrl: cleanExtUrl || undefined,
      nomorSurat: cleanNomor || undefined,
      perihalSurat: cleanPerihal || undefined,
      isiSuratTeks: cleanIsi || undefined,
      waktuUpload:
        (draft && 'waktuUpload' in draft && draft.waktuUpload) ||
        new Date().toLocaleString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
    };
  };

  const handleAddAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newAnnouncementText.trim();
    if (!cleaned || !onUpdateBranding) return;

    const finalLetter = buildFinalLetterObject(
      newLetterDraft,
      newLetterNomor,
      newLetterPerihal,
      newLetterExternalUrl,
      newLetterIsiTeks
    );

    const updatedAnnouncements = [...announcements, cleaned];
    const updatedLetters = [...announcementLetters, finalLetter];

    onUpdateBranding({
      runningTextItems: updatedAnnouncements,
      announcementLetters: updatedLetters,
    });

    setNewAnnouncementText('');
    setNewLetterDraft(null);
    setNewLetterNomor('');
    setNewLetterPerihal('');
    setNewLetterExternalUrl('');
    setNewLetterIsiTeks('');
    setNewLetterNotice(null);
    setShowNewLetterForm(false);
    triggerSavedNotice(
      finalLetter
        ? `✓ Pengumuman baru beserta lampiran surat "${finalLetter.fileName}" berhasil disimpan!`
        : '✓ Pengumuman baru berhasil ditambahkan & disimpan ke Cloud.'
    );
  };

  const handleSaveEdit = (idx: number) => {
    const cleaned = editingText.trim();
    if (!cleaned || !onUpdateBranding) return;

    const finalLetter = buildFinalLetterObject(
      editLetterDraft,
      editLetterNomor,
      editLetterPerihal,
      editLetterExternalUrl,
      editLetterIsiTeks
    );

    const updatedAnnouncements = [...announcements];
    updatedAnnouncements[idx] = cleaned;

    const updatedLetters = [...announcementLetters];
    updatedLetters[idx] = finalLetter;

    onUpdateBranding({
      runningTextItems: updatedAnnouncements,
      announcementLetters: updatedLetters,
    });

    setEditingIndex(null);
    setEditingText('');
    setEditLetterDraft(null);
    triggerSavedNotice(
      finalLetter
        ? `✓ Pengumuman #${idx + 1} & Lampiran Surat "${finalLetter.fileName}" berhasil disimpan!`
        : `✓ Pengumuman #${idx + 1} berhasil diperbarui & disimpan.`
    );
  };

  const handleDeleteAnnouncement = (idx: number) => {
    if (!onUpdateBranding) return;
    const updatedAnnouncements = announcements.filter((_, i) => i !== idx);
    const updatedLetters = announcementLetters.filter((_, i) => i !== idx);
    onUpdateBranding({
      runningTextItems: updatedAnnouncements,
      announcementLetters: updatedLetters,
    });
    if (editingIndex === idx) {
      setEditingIndex(null);
      setEditingText('');
    }
    triggerSavedNotice(`Pengumuman #${idx + 1} berhasil dihapus.`);
  };

  const handleDownloadLetterFile = (letter: AnnouncementLetter) => {
    if (letter.fileDataUrl) {
      const blobUrl = createBlobUrlFromDataUrl(letter.fileDataUrl) || letter.fileDataUrl;
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = letter.fileName || 'Surat-Pengumuman-Panitia';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (blobUrl.startsWith('blob:')) {
        window.setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      }
      return;
    }
    if (letter.externalUrl) {
      window.open(letter.externalUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDownloadLetterOrGenerate = (
    announcementText: string,
    idx: number,
    letter?: AnnouncementLetter | null
  ) => {
    if (letter && (letter.fileDataUrl || letter.externalUrl)) {
      handleDownloadLetterFile(letter);
      return;
    }
    downloadGeneratedOfficialLetterDoc({
      announcementText,
      index: idx,
      letter,
    });
  };

  const handleShareAllPanitiaInfoToWa = async () => {
    const bulletAnnouncements = announcements
      .map((item, idx) => {
        const snippet = getAnnouncementSnippetWords(item, 6);
        const letter = announcementLetters[idx];
        const letterNote = letter
          ? `\n   📎 _Dilengkapi Surat Resmi: ${letter.perihalSurat || letter.fileName}_`
          : '';
        return `*${idx + 1}. ${snippet}*\n   "${item}"${letterNote}`;
      })
      .join('\n\n');

    const waText =
      `📢 *PENGUMUMAN PANITIA: ${primarySnippetWords}*\n` +
      `_Panitia HAB ke-81 Kemenag Kab. Tojo Una-Una Tahun 2027_\n\n` +
      `${bulletAnnouncements}\n\n` +
      `🔗 *Buka Web Pengumuman & Baca Isi Surat Resmi:*\n${officialStandaloneWebUrl}`;

    const cardCanvas = await renderAnnouncementWaCardCanvas({
      text: primaryAnnouncementText,
      index: highlightedAnnouncementIndex,
      letter: announcementLetters[highlightedAnnouncementIndex],
      logoUrl: branding.kemenagLogoPrimaryUrl || '/Kementerian-Agama.png',
    });

    await shareToWhatsAppWithFullImage({
      title: `Pengumuman Panitia: ${primarySnippetWords}`,
      waText,
      canvas: cardCanvas,
      fileName: 'pengumuman-panitia-hab81-touna.jpg',
    });
  };

  const handleShareSingleAnnouncementToWa = async (text: string, idx: number) => {
    const slug = getAnnouncementUrlSlug(text, 6);
    const snippet = getAnnouncementSnippetWords(text, 6);
    const itemUrl = buildDeepLink({
      halaman: 'pengumuman',
      pengumuman: String(idx + 1),
      redaksi: slug,
    });
    const letter = announcementLetters[idx];
    const waText = formatAnnouncementWhatsAppText({
      text,
      index: idx,
      letter,
      url: itemUrl,
    });

    const cardCanvas = await renderAnnouncementWaCardCanvas({
      text,
      index: idx,
      letter,
      logoUrl: branding.kemenagLogoPrimaryUrl || '/Kementerian-Agama.png',
    });

    await shareToWhatsAppWithFullImage({
      title: `Pengumuman #${idx + 1}: ${snippet}`,
      waText,
      canvas: cardCanvas,
      fileName: `pengumuman-${idx + 1}-hab81.jpg`,
    });
  };

  const showAdminControls = isAdminUnlocked && isManageOpen;

  const innerContent = (
    <div
      className={
        isStandalonePage
          ? 'max-w-4xl mx-auto my-6 sm:my-10 bg-[#03251c] border-2 border-amber-400/70 rounded-2xl shadow-2xl overflow-hidden'
          : 'bg-[#03251c] border-2 border-amber-400/70 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden'
      }
    >
      {/* Header */}
      <div className="px-5 py-4 bg-[#021b15] border-b border-emerald-800 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          {isStandalonePage ? (
            <div className="flex items-center gap-2 shrink-0">
              <KemenagLogoImg branding={branding} className="w-10 h-10" />
              <Hab81LogoBadge branding={branding} className="w-10 h-10" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/50 flex items-center justify-center text-amber-300 shrink-0">
              <Megaphone className="w-5 h-5" />
            </div>
          )}
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-amber-300 flex items-center gap-1.5">
              <span>Halaman Web Khusus Pengumuman Resmi Panitia</span>
            </div>
            <h1
              id="panitia-info-modal-title"
              className="text-base sm:text-lg font-bold text-white"
            >
              Pengumuman & Surat Resmi Panitia HAB ke-81 Kemenag Touna 2027
            </h1>
            <div className="text-[7.5px] font-normal tracking-wide text-slate-400/45 uppercase select-none">
              by HUMAS KEMENTERIAN AGAMA KABUPATEN TOJO UNA UNA
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleToggleManageMode}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer border transition-colors ${
              showAdminControls
                ? 'bg-amber-400 text-slate-950 border-amber-300'
                : 'bg-emerald-950/90 hover:bg-emerald-900 text-amber-300 border-amber-400/40'
            }`}
            title="Edit pengumuman atau upload lampiran surat Word/PDF (Khusus Admin)"
          >
            {isAdminUnlocked ? (
              <Edit3 className="w-3.5 h-3.5" />
            ) : (
              <Lock className="w-3.5 h-3.5" />
            )}
            <span>
              {showAdminControls ? '✓ Simpan Perubahan' : 'Edit / Upload Surat (Admin)'}
            </span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-emerald-900/80 hover:bg-emerald-800 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            {isStandalonePage ? (
              <>
                <ArrowLeft className="w-3.5 h-3.5 text-amber-300" />
                <span>Ke Portal Utama</span>
              </>
            ) : (
              <>
                <X className="w-4 h-4" />
                <span>Tutup</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Body */}
      <div
        className={
          isStandalonePage ? 'p-5 sm:p-7 space-y-6' : 'p-5 sm:p-6 overflow-y-auto space-y-6'
        }
      >
        {/* PIN Unlock Prompt if Admin clicked Edit / Upload Surat while locked */}
        {showPinPrompt && !isAdminUnlocked && (
          <form
            onSubmit={handleVerifyPin}
            className="p-4 rounded-xl bg-[#021b15] border-2 border-amber-400/60 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>
                  Sistem Terkunci — Masukkan PIN Admin untuk Mengedit Pengumuman / Upload Surat
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPinPrompt(false);
                  setPendingEditIdxAfterPin(null);
                }}
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Batal
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Masukkan PIN Admin..."
                className="flex-1 px-3 py-2 rounded-lg bg-[#03251c] border border-emerald-700 text-white text-xs focus:outline-none focus:border-amber-400"
                autoFocus
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs cursor-pointer"
              >
                Buka Kunci Admin
              </button>
            </div>
            {pinError && <p className="text-xs text-rose-400 font-semibold">{pinError}</p>}
          </form>
        )}

        {/* Save notification toast */}
        {saveNotice && (
          <div className="px-4 py-2.5 rounded-xl bg-emerald-900/90 border border-emerald-400/50 text-emerald-200 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 text-amber-300 shrink-0" />
            <span>{saveNotice}</span>
          </div>
        )}

        {/* Dedicated Web Link Box for "Pengumuman Panitia Saja" — Khusus Admin */}
        {showAdminControls && (
          <div className="p-4 sm:p-5 rounded-2xl bg-[#021b15] border-2 border-amber-400/50 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-amber-300">
                <Globe className="w-4 h-4 shrink-0" />
                <span>Link Versi Web Khusus Pengumuman Panitia Saja (Panel Admin)</span>
              </div>
            {!isStandalonePage && onOpenStandalonePage && (
              <button
                type="button"
                onClick={onOpenStandalonePage}
                className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer w-fit"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buka Tampilan Web Pengumuman Saja</span>
              </button>
            )}
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Saat Anda menekan tombol <strong className="text-amber-300">Salin Redaksi & Link WA</strong>{' '}
            di bawah ini lalu menempelkannya ke <strong className="text-white">Grup WhatsApp</strong>,
            pesan akan otomatis menampilkan <strong className="text-amber-200">4–6 kata judul redaksi</strong>{' '}
            (<span className="italic text-emerald-200">&ldquo;{primarySnippetWords}&rdquo;</span>) beserta
            isi pengumuman dan tautan resminya:
          </p>

          <div className="space-y-2">
            {/* Link 1: Official Public GitHub Pages Link + Redaksi WA */}
            <div className="p-2.5 rounded-xl bg-[#03251c] border border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="min-w-0 space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 block">
                  Redaksi WA (6 Kata) + Link Publik Resmi:
                </span>
                <div className="text-xs font-bold text-white truncate">
                  📢 {primarySnippetWords}
                </div>
                <a
                  href={officialStandaloneWebUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-amber-300 hover:underline font-mono-tabular break-all block"
                >
                  {officialStandaloneWebUrl}
                </a>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleCopyText(
                    formatAnnouncementWhatsAppText({
                      text: primaryAnnouncementText,
                      index: highlightedAnnouncementIndex,
                      letter: announcementLetters[highlightedAnnouncementIndex],
                      url: officialStandaloneWebUrl,
                    }),
                    'official'
                  )
                }
                className="px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-amber-200 text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                {copiedLinkType === 'official' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-amber-300" />
                    <span>Redaksi & Link Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Redaksi & Link Resmi</span>
                  </>
                )}
              </button>
            </div>

            {/* Link 2: Current Active Server Domain Link (if different from GitHub Pages) */}
            {currentOriginStandaloneUrl !== officialStandaloneWebUrl && (
              <div className="p-2.5 rounded-xl bg-[#03251c] border border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0 space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 block">
                    Redaksi WA (6 Kata) + Link Server Web Aktif Saat Ini:
                  </span>
                  <div className="text-xs font-bold text-white truncate">
                    📢 {primarySnippetWords}
                  </div>
                  <a
                    href={currentOriginStandaloneUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-amber-200 hover:underline font-mono-tabular break-all block"
                  >
                    {currentOriginStandaloneUrl}
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleCopyText(
                      formatAnnouncementWhatsAppText({
                        text: primaryAnnouncementText,
                        index: highlightedAnnouncementIndex,
                        letter: announcementLetters[highlightedAnnouncementIndex],
                        url: currentOriginStandaloneUrl,
                      }),
                      'current'
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-emerald-900 hover:bg-emerald-800 border border-emerald-700 text-emerald-200 text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  {copiedLinkType === 'current' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-amber-300" />
                      <span>Redaksi & Link Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Redaksi & Link Server Ini</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleShareAllPanitiaInfoToWa}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Bagikan Kartu Redaksi & Link ke WhatsApp</span>
              </button>
            </div>
          </div>
        )}

        {/* Active Announcements List + Direct Admin Editor & Letter Upload */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-amber-300" />
              <span>
                Daftar Pengumuman & Surat Resmi Panitia ({announcements.length} Pengumuman)
              </span>
            </h2>

            {showAdminControls && (
              <div className="flex flex-wrap items-center gap-2">
                {onOpenAdminTab && (
                  <button
                    type="button"
                    onClick={() => onOpenAdminTab(4)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-900/80 hover:bg-emerald-800 border border-emerald-700 text-emerald-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                    title="Buka di Panel Admin -> Tab 5 (Branding & Pengumuman Berjalan)"
                  >
                    <Settings className="w-3 h-3 text-amber-300" />
                    <span>Panel Admin (Tab 5)</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Admin Add New Announcement + Optional Word/PDF Letter Form */}
          {showAdminControls && onUpdateBranding && (
            <form
              onSubmit={handleAddAnnouncement}
              className="p-4 sm:p-5 rounded-xl bg-[#021b15] border-2 border-amber-400/60 space-y-3.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-bold text-amber-300">
                  + Tambah Pengumuman Panitia Baru (Bisa Disertai Upload Surat Word / PDF)
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewLetterForm((prev) => !prev)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-900 hover:bg-emerald-800 border border-amber-400/50 text-amber-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Paperclip className="w-3 h-3" />
                  <span>
                    {showNewLetterForm
                      ? 'Sembunyikan Form Upload Surat'
                      : '+ Lampirkan Surat Resmi (.PDF / .DOCX / .DOC)'}
                  </span>
                </button>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-slate-200">
                  Isi Teks Pengumuman Panitia *
                </label>
                <textarea
                  rows={2}
                  value={newAnnouncementText}
                  onChange={(e) => setNewAnnouncementText(e.target.value)}
                  placeholder="Ketik isi pengumuman resmi panitia di sini..."
                  className="w-full px-3 py-2 rounded-lg bg-[#03251c] border border-emerald-700 text-white text-xs sm:text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              {showNewLetterForm && (
                <div className="p-3.5 rounded-xl bg-[#03251c] border border-emerald-700/90 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Lampiran Surat Resmi Pengumuman (Format Word .DOCX/.DOC atau .PDF)</span>
                    </span>
                    {newLetterDraft && (
                      <button
                        type="button"
                        onClick={() => {
                          setNewLetterDraft(null);
                          setNewLetterNotice(null);
                        }}
                        className="text-[11px] text-rose-300 hover:underline cursor-pointer"
                      >
                        Hapus File Terpilih ({newLetterDraft.fileName})
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <label className="px-3.5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-sm">
                      <Upload className="w-3.5 h-3.5" />
                      <span>
                        {isUploadingNewLetter
                          ? 'Memproses File Surat...'
                          : newLetterDraft
                          ? `Ganti File Surat (${newLetterDraft.fileName})`
                          : 'Pilih File Surat Word (.DOCX / .DOC) atau .PDF'}
                      </span>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={handleNewLetterFileChange}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[11px] text-slate-300">
                      Mendukung file <strong>.PDF</strong>, <strong>.DOCX</strong>, atau{' '}
                      <strong>.DOC</strong>
                    </span>
                  </div>

                  {newLetterNotice && (
                    <div className="p-2.5 rounded-lg bg-[#021b15] border border-amber-400/40 text-[11px] text-amber-200">
                      {newLetterNotice}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1">
                        Nomor Surat (Opsional)
                      </label>
                      <input
                        type="text"
                        value={newLetterNomor}
                        onChange={(e) => setNewLetterNomor(e.target.value)}
                        placeholder="Contoh: B-812/Kk.22.09/1/HM.01/11/2026"
                        className="w-full px-3 py-1.5 rounded-lg bg-[#021b15] border border-emerald-800 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1">
                        Judul / Perihal Surat (Opsional)
                      </label>
                      <input
                        type="text"
                        value={newLetterPerihal}
                        onChange={(e) => setNewLetterPerihal(e.target.value)}
                        placeholder="Contoh: Edaran Resmi Pelaksanaan HAB ke-81"
                        className="w-full px-3 py-1.5 rounded-lg bg-[#021b15] border border-emerald-800 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">
                      Link Dokumen Google Drive / URL Eksternal (Opsional jika tidak upload file)
                    </label>
                    <input
                      type="url"
                      value={newLetterExternalUrl}
                      onChange={(e) => setNewLetterExternalUrl(e.target.value)}
                      placeholder="https://drive.google.com/file/d/..."
                      className="w-full px-3 py-1.5 rounded-lg bg-[#021b15] border border-emerald-800 text-xs text-amber-200 font-mono-tabular"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">
                      Isi Surat Lengkap (Otomatis terisi dari file Word .DOCX, atau ketik/edit agar nyaman dibaca pengguna di layar):
                    </label>
                    <textarea
                      rows={4}
                      value={newLetterIsiTeks}
                      onChange={(e) => setNewLetterIsiTeks(e.target.value)}
                      placeholder="Isi surat akan tampil saat pengguna menekan tombol 'Baca Isi Surat'..."
                      className="w-full px-3 py-2 rounded-lg bg-[#021b15] border border-emerald-800 text-xs text-white leading-relaxed"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>✓ Simpan Pengumuman & Surat</span>
                </button>
              </div>
            </form>
          )}

          {/* Announcements Cards List */}
          <div className="space-y-3">
            {announcements.map((item, index) => {
              const isEditingThis = showAdminControls && editingIndex === index;
              const attachedLetter = announcementLetters[index];
              const itemSnippetWords = getAnnouncementSnippetWords(item, 6);
              const itemSlug = getAnnouncementUrlSlug(item, 6);
              const singleItemUrl = buildDeepLink({
                halaman: 'pengumuman',
                pengumuman: String(index + 1),
                redaksi: itemSlug,
              });
              const singleItemWaText = formatAnnouncementWhatsAppText({
                text: item,
                index,
                letter: attachedLetter,
                url: singleItemUrl,
              });
              const isHighlighted = index === highlightedAnnouncementIndex;

              return (
                <div
                  key={index}
                  className={`p-4 sm:p-5 rounded-xl bg-[#021b15]/95 border flex flex-col gap-3.5 ${
                    isHighlighted
                      ? 'border-amber-400/90 shadow-lg shadow-amber-950/30'
                      : 'border-emerald-800/80'
                  }`}
                >
                  {isEditingThis ? (
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between border-b border-emerald-800 pb-2">
                        <div className="text-xs font-bold text-amber-300">
                          Edit Pengumuman #{index + 1} & Lampiran Surat Resmi (Word / PDF)
                        </div>
                        <span className="text-[11px] text-emerald-300">
                          Klik Simpan Perubahan setelah selesai
                        </span>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold text-slate-300">
                          Teks Pengumuman #{index + 1}:
                        </label>
                        <textarea
                          rows={2}
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-[#03251c] border border-amber-400 text-white text-xs sm:text-sm focus:outline-none"
                        />
                      </div>

                      {/* Letter Attachment Editor inside Announcement Edit */}
                      <div className="p-3.5 rounded-xl bg-[#03251c] border border-amber-400/40 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                            <Paperclip className="w-3.5 h-3.5" />
                            <span>
                              {editLetterDraft
                                ? `Surat Terlampir: ${editLetterDraft.fileName} (${editLetterDraft.fileType.toUpperCase()})`
                                : 'Upload / Lampirkan Surat Resmi (.PDF / Word .DOCX / .DOC)'}
                            </span>
                          </span>

                          {(editLetterDraft || editLetterExternalUrl || editLetterIsiTeks) && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditLetterDraft(null);
                                setEditLetterNomor('');
                                setEditLetterPerihal('');
                                setEditLetterExternalUrl('');
                                setEditLetterIsiTeks('');
                                setEditLetterNotice('Lampiran surat dihapus. Klik Simpan Perubahan untuk menerapkan.');
                              }}
                              className="px-2.5 py-1 rounded bg-rose-950/90 hover:bg-rose-900 border border-rose-700 text-rose-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Hapus Lampiran Surat</span>
                            </button>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <label className="px-3.5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-sm">
                            <Upload className="w-3.5 h-3.5" />
                            <span>
                              {isUploadingEditLetter
                                ? 'Memproses File Surat...'
                                : editLetterDraft
                                ? 'Ganti File Surat (.PDF / .DOCX / .DOC)'
                                : 'Upload File Surat (.PDF / .DOCX / .DOC)'}
                            </span>
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                              onChange={handleEditLetterFileChange}
                              className="hidden"
                            />
                          </label>
                          <span className="text-[11px] text-slate-300">
                            Pilih file surat berformat <strong>Word (.docx/.doc)</strong> atau{' '}
                            <strong>PDF (.pdf)</strong>
                          </span>
                        </div>

                        {editLetterNotice && (
                          <div className="p-2.5 rounded-lg bg-[#021b15] border border-amber-400/40 text-[11px] text-amber-200">
                            {editLetterNotice}
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] text-slate-300 mb-1">
                              Nomor Surat Resmi (Opsional)
                            </label>
                            <input
                              type="text"
                              value={editLetterNomor}
                              onChange={(e) => setEditLetterNomor(e.target.value)}
                              placeholder="Contoh: B-812/Kk.22.09/1/HM.01/11/2026"
                              className="w-full px-3 py-1.5 rounded-lg bg-[#021b15] border border-emerald-800 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-300 mb-1">
                              Judul / Perihal Surat (Opsional)
                            </label>
                            <input
                              type="text"
                              value={editLetterPerihal}
                              onChange={(e) => setEditLetterPerihal(e.target.value)}
                              placeholder="Contoh: Surat Edaran Pelaksanaan HAB ke-81"
                              className="w-full px-3 py-1.5 rounded-lg bg-[#021b15] border border-emerald-800 text-xs text-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-300 mb-1">
                            Link Dokumen Google Drive / URL Surat (Opsional)
                          </label>
                          <input
                            type="url"
                            value={editLetterExternalUrl}
                            onChange={(e) => setEditLetterExternalUrl(e.target.value)}
                            placeholder="https://drive.google.com/file/d/..."
                            className="w-full px-3 py-1.5 rounded-lg bg-[#021b15] border border-emerald-800 text-xs text-amber-200 font-mono-tabular"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-300 mb-1">
                            Isi Surat (Otomatis diekstrak dari file Word .DOCX, atau ketik/edit agar bisa dibaca langsung saat pengguna klik &ldquo;Baca Isi Surat&rdquo;):
                          </label>
                          <textarea
                            rows={5}
                            value={editLetterIsiTeks}
                            onChange={(e) => setEditLetterIsiTeks(e.target.value)}
                            placeholder="Ketik atau tempel isi surat di sini (atau upload file .docx di atas untuk ekstraksi otomatis)..."
                            className="w-full px-3 py-2 rounded-lg bg-[#021b15] border border-emerald-800 text-xs text-white leading-relaxed"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingIndex(null);
                            setEditingText('');
                            setEditLetterDraft(null);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(index)}
                          className="px-4 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold flex items-center gap-1 cursor-pointer shadow"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>✓ Simpan Perubahan</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">
                            {index + 1}
                          </span>
                          <div className="space-y-2">
                            <div className="inline-flex flex-wrap items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-400/15 border border-amber-400/40 text-amber-300 text-xs font-extrabold">
                              <span>📢 Ringkasan Redaksi WA:</span>
                              <span className="text-white">&ldquo;{itemSnippetWords}&rdquo;</span>
                            </div>
                            <p className="text-sm sm:text-base text-white leading-relaxed font-medium">
                              {item}
                            </p>

                            {/* Always-available User Actions: Lihat Isi Surat Langsung di Halaman Web & Unduh Surat */}
                            <div className="p-3 rounded-xl bg-[#03251c] border border-amber-400/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-start gap-2.5 min-w-0">
                                <div className="p-2 rounded-lg bg-amber-400/15 border border-amber-400/40 text-amber-300 shrink-0">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 text-[10px] font-extrabold uppercase">
                                      {attachedLetter
                                        ? attachedLetter.fileType === 'pdf'
                                          ? 'SURAT PDF RESMI'
                                          : attachedLetter.fileType === 'word'
                                          ? 'SURAT WORD RESMI'
                                          : 'DOKUMEN SURAT RESMI'
                                        : 'LEMBAR SURAT RESMI PANITIA'}
                                    </span>
                                    {attachedLetter?.nomorSurat && (
                                      <span className="text-[11px] font-mono-tabular text-amber-200">
                                        No: {attachedLetter.nomorSurat}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs font-bold text-white truncate mt-0.5">
                                    {attachedLetter?.perihalSurat ||
                                      attachedLetter?.fileName ||
                                      itemSnippetWords}
                                  </div>
                                  <div className="text-[11px] text-slate-300 truncate">
                                    {attachedLetter
                                      ? `File: ${attachedLetter.fileName}${
                                          attachedLetter.fileSizeKb
                                            ? ` (${attachedLetter.fileSizeKb} KB)`
                                            : ''
                                        }`
                                      : 'Klik tombol di samping untuk melihat isi surat langsung di halaman web atau mengunduh surat.'}
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setInlineLetterIndex((prev) => (prev === index ? null : index))
                                  }
                                  className="px-3.5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-md"
                                >
                                  <BookOpen className="w-3.5 h-3.5" />
                                  <span>
                                    {inlineLetterIndex === index
                                      ? 'Tutup Tampilan Surat'
                                      : 'Lihat Isi Surat di Web'}
                                  </span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDownloadLetterOrGenerate(item, index, attachedLetter)
                                  }
                                  className="px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow"
                                  title="Unduh Dokumen Surat ke Perangkat Anda"
                                >
                                  <Download className="w-3.5 h-3.5 text-amber-300" />
                                  <span>
                                    {attachedLetter?.fileType === 'pdf'
                                      ? 'Unduh Surat (.PDF)'
                                      : 'Unduh Surat (.DOC)'}
                                  </span>
                                </button>

                                {attachedLetter && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setReadingLetterState({
                                        announcementIndex: index,
                                        announcementText: item,
                                        letter: attachedLetter,
                                      })
                                    }
                                    className="px-2.5 py-2 rounded-lg bg-[#021b15] hover:bg-emerald-900 border border-emerald-700 text-emerald-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                    title="Buka Isi Surat dalam Mode Layar Penuh"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5 text-amber-300" />
                                    <span>Layar Penuh</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Direct Inline Letter Viewer on the Web Page */}
                            {inlineLetterIndex === index && (
                              <div className="mt-2 bg-white text-slate-900 rounded-xl p-5 sm:p-7 shadow-xl border-2 border-amber-400 space-y-4">
                                {/* Official Kemenag Letterhead */}
                                <div className="border-b-2 border-slate-900 pb-3.5 flex items-center gap-3.5">
                                  <KemenagLogoImg
                                    branding={branding}
                                    className="w-12 h-12 sm:w-14 sm:h-14 shrink-0"
                                  />
                                  <div className="text-center flex-1">
                                    <div className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-slate-900">
                                      KEMENTERIAN AGAMA REPUBLIK INDONESIA
                                    </div>
                                    <div className="text-xs sm:text-sm font-bold uppercase text-emerald-900">
                                      KANTOR KEMENTERIAN AGAMA KABUPATEN TOJO UNA-UNA
                                    </div>
                                    <div className="text-[11px] font-semibold text-slate-600">
                                      PANITIA PELAKSANA HARI AMAL BAKTI (HAB) KE-81 TAHUN 2027
                                    </div>
                                  </div>
                                </div>

                                {/* Nomor & Perihal Surat */}
                                <div className="text-xs sm:text-sm space-y-1 border-b border-slate-200 pb-3">
                                  <div>
                                    <span className="font-bold inline-block w-24">Nomor</span>:{' '}
                                    {attachedLetter?.nomorSurat ||
                                      `B-0${index + 1}/Kk.22.09/PAN-HAB81/11/2026`}
                                  </div>
                                  <div>
                                    <span className="font-bold inline-block w-24">Sifat</span>:{' '}
                                    Penting
                                  </div>
                                  <div>
                                    <span className="font-bold inline-block w-24">Perihal</span>:{' '}
                                    <span className="font-bold">
                                      {attachedLetter?.perihalSurat || itemSnippetWords}
                                    </span>
                                  </div>
                                </div>

                                {/* Embedded PDF / Google Drive Preview if Admin uploaded a PDF or External Link */}
                                {attachedLetter?.fileType === 'pdf' && inlineBlobUrl && (
                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                                      <span>Dokumen Surat PDF Resmi:</span>
                                      <a
                                        href={inlineBlobUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-emerald-700 hover:underline flex items-center gap-1"
                                      >
                                        <span>Buka PDF di Tab Baru</span>
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </a>
                                    </div>
                                    <div className="w-full h-[55vh] rounded-lg overflow-hidden border border-slate-300 bg-slate-100">
                                      <iframe
                                        src={inlineBlobUrl}
                                        title={attachedLetter.fileName}
                                        className="w-full h-full border-0"
                                      />
                                    </div>
                                  </div>
                                )}

                                {attachedLetter?.externalUrl && (
                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                                      <span>Lampiran Dokumen Surat Resmi:</span>
                                      <a
                                        href={attachedLetter.externalUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-emerald-700 hover:underline flex items-center gap-1"
                                      >
                                        <span>Buka Dokumen Asli</span>
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </a>
                                    </div>
                                    <div className="w-full h-[52vh] rounded-lg overflow-hidden border border-slate-300 bg-slate-100">
                                      <iframe
                                        src={
                                          getEmbeddableDocumentUrl(attachedLetter.externalUrl) ||
                                          attachedLetter.externalUrl
                                        }
                                        title={attachedLetter.fileName}
                                        className="w-full h-full border-0"
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* Full Letter Text Paragraphs directly on the Web Page */}
                                <div className="text-xs sm:text-sm text-slate-900 leading-relaxed whitespace-pre-line font-serif py-2">
                                  {attachedLetter?.isiSuratTeks || item}
                                </div>

                                {/* Signature & Direct Download Bar */}
                                <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDownloadLetterOrGenerate(item, index, attachedLetter)
                                      }
                                      className="px-4 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow"
                                    >
                                      <Download className="w-3.5 h-3.5 text-amber-300" />
                                      <span>Unduh File Surat Ini</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setInlineLetterIndex(null)}
                                      className="px-3 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold cursor-pointer"
                                    >
                                      Tutup Tampilan Surat
                                    </button>
                                  </div>

                                  <div className="text-xs text-slate-800 text-right">
                                    <div className="font-semibold">
                                      Panitia Pelaksana HAB ke-81 Tahun 2027,
                                    </div>
                                    <div className="font-bold mt-4 text-emerald-900">
                                      Kantor Kementerian Agama Kab. Tojo Una-Una
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-start">
                          {showAdminControls && (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditorForAnnouncement(index, item)}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/50 text-amber-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Paperclip className="w-3 h-3" />
                                <span>
                                  {attachedLetter ? 'Edit / Ganti Surat' : '+ Upload Surat'}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteAnnouncement(index)}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-rose-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Hapus</span>
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => handleCopyText(singleItemWaText, index)}
                            className="px-2.5 py-1.5 rounded-lg bg-[#03251c] hover:bg-emerald-900 border border-emerald-700 text-amber-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                            title="Salin Redaksi (4-6 Kata + Isi Pengumuman) & Link untuk Grup WhatsApp"
                          >
                            {copiedLinkType === index ? (
                              <>
                                <Check className="w-3 h-3 text-amber-300" />
                                <span>Redaksi & Link Tersalin!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Salin Redaksi & Link</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleShareSingleAnnouncementToWa(item, index)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Share2 className="w-3 h-3" />
                            <span>Bagikan WA</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* In standalone mode, keep schedule collapsed by default so the page is purely Pengumuman Panitia Saja */}
        {isStandalonePage ? (
          <div className="pt-2 border-t border-emerald-900/80">
            <button
              type="button"
              onClick={() => setShowScheduleInStandalone((prev) => !prev)}
              className="text-xs font-semibold text-emerald-300 hover:text-amber-300 flex items-center gap-1.5 cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-300" />
              <span>
                {showScheduleInStandalone
                  ? 'Sembunyikan Lampiran Ringkasan Jadwal Kegiatan'
                  : `+ Tampilkan Lampiran Ringkasan Jadwal Kegiatan (${schedules.length} Agenda)`}
              </span>
            </button>
          </div>
        ) : null}

        {(!isStandalonePage || showScheduleInStandalone) && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-300" />
                <span>Ringkasan Jadwal & Agenda Kegiatan ({schedules.length} Agenda)</span>
              </h3>

              <div className="flex flex-wrap items-center gap-3">
                {isAdminUnlocked && onOpenAdminTab && (
                  <button
                    type="button"
                    onClick={() => onOpenAdminTab(1)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-900/80 hover:bg-emerald-800 border border-emerald-700 text-emerald-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                    title="Buka Tabel Edit Jadwal di Panel Admin (Tab 2)"
                  >
                    <Settings className="w-3 h-3 text-amber-300" />
                    <span>Edit Jadwal di Panel Admin (Tab 2)</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onJumpToSection('jadwal-acara');
                  }}
                  className="text-xs text-amber-300 hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                >
                  <span>Buka Tabel Jadwal Lengkap</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {schedules.map((sch) => {
                const schLink = buildDeepLink({ jadwal: sch.id });
                return (
                  <div
                    key={sch.id}
                    className="p-3.5 rounded-xl bg-[#021b15]/80 border border-emerald-800/70 flex flex-col justify-between gap-2.5"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 text-[11px] text-amber-300 font-semibold">
                        <span>{sch.kategori}</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-900/90 text-emerald-200">
                          {sch.status}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-white mt-1">{sch.judul}</div>
                      <div className="text-[11px] text-slate-300 mt-0.5">
                        {sch.tanggal} · {sch.waktu} · PIC: {sch.pic}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-emerald-900/80">
                      <button
                        type="button"
                        onClick={() => {
                          const waText =
                            `📅 *AGENDA HAB KE-81 KEMENAG TOJO UNA-UNA*\n\n` +
                            `*${sch.judul}*\n` +
                            `• Kategori: ${sch.kategori}\n` +
                            `• Tanggal: ${sch.tanggal}\n` +
                            `• Waktu: ${sch.waktu}\n` +
                            `• Penanggung Jawab: ${sch.pic}\n` +
                            `• Keterangan: ${sch.catatan}\n\n` +
                            `🔗 *Link Jadwal Resmi:*\n${schLink}`;
                          void shareToWhatsAppWithFullImage({
                            title: sch.judul,
                            waText,
                          });
                        }}
                        className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Share2 className="w-3 h-3" />
                        <span>Bagikan WA</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3.5 bg-[#021b15] border-t border-emerald-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenJournal();
          }}
          className="text-amber-300 hover:underline font-semibold cursor-pointer"
        >
          Buka Menu Khusus Jurnal & Berita Resmi →
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold cursor-pointer"
        >
          {isStandalonePage ? 'Buka Portal Utama Lengkap' : 'Selesai'}
        </button>
      </div>

      {/* IN-APP OFFICIAL LETTER READER MODAL ("Pembaca Isi Surat Resmi Panitia") */}
      {readingLetterState && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pembaca Isi Surat Resmi Panitia"
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
        >
          <div className="bg-[#03251c] border-2 border-amber-400 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Reader Header */}
            <div className="px-5 py-4 bg-[#021b15] border-b border-emerald-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-amber-400/15 border border-amber-400/50 text-amber-300 shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 text-[10px] font-extrabold uppercase">
                      {readingLetterState.letter.fileType === 'pdf'
                        ? 'DOKUMEN SURAT PDF'
                        : readingLetterState.letter.fileType === 'word'
                        ? 'DOKUMEN SURAT WORD'
                        : 'SURAT RESMI PANITIA'}
                    </span>
                    {readingLetterState.letter.nomorSurat && (
                      <span className="text-xs font-mono-tabular text-amber-300 font-semibold">
                        No. Surat: {readingLetterState.letter.nomorSurat}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white truncate mt-0.5">
                    {readingLetterState.letter.perihalSurat ||
                      readingLetterState.letter.fileName}
                  </h3>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {(readingLetterState.letter.fileDataUrl ||
                  readingLetterState.letter.externalUrl) && (
                  <button
                    type="button"
                    onClick={() => handleDownloadLetterFile(readingLetterState.letter)}
                    className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh File Surat</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setReadingLetterState(null)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-900 hover:bg-emerald-800 text-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>Tutup Surat</span>
                </button>
              </div>
            </div>

            {/* Reader Content Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
              {/* Context Box: Related Announcement */}
              <div className="p-3.5 rounded-xl bg-[#021b15] border border-emerald-800/90 space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                  Lampiran untuk Pengumuman Panitia #{readingLetterState.announcementIndex + 1}:
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  {readingLetterState.announcementText}
                </p>
              </div>

              {/* 1. Embedded PDF / External Document Frame if PDF or External Link */}
              {readingLetterState.letter.fileType === 'pdf' && activeBlobUrl && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-emerald-300 font-semibold">
                    <span>Pratinjau Dokumen Surat PDF Resmi:</span>
                    <a
                      href={activeBlobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-300 hover:underline flex items-center gap-1"
                    >
                      <span>Buka PDF Layar Penuh di Tab Baru</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  <div className="w-full h-[62vh] rounded-xl overflow-hidden border-2 border-amber-400/50 bg-slate-900">
                    <iframe
                      src={activeBlobUrl}
                      title={readingLetterState.letter.fileName}
                      className="w-full h-full border-0"
                    />
                  </div>
                </div>
              )}

              {readingLetterState.letter.externalUrl && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-emerald-300 font-semibold">
                    <span>Pratinjau Dokumen Surat Eksternal:</span>
                    <a
                      href={readingLetterState.letter.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-300 hover:underline flex items-center gap-1"
                    >
                      <span>Buka Link Dokumen Asli</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  <div className="w-full h-[58vh] rounded-xl overflow-hidden border-2 border-amber-400/50 bg-slate-900">
                    <iframe
                      src={
                        getEmbeddableDocumentUrl(readingLetterState.letter.externalUrl) ||
                        readingLetterState.letter.externalUrl
                      }
                      title={readingLetterState.letter.fileName}
                      className="w-full h-full border-0"
                    />
                  </div>
                </div>
              )}

              {/* 2. Formatted Official Letter Paper View for Word (.docx/.doc) or Text Content */}
              {readingLetterState.letter.isiSuratTeks ? (
                <div className="bg-white text-slate-900 rounded-xl p-6 sm:p-8 shadow-xl border-2 border-amber-400/60 space-y-5">
                  {/* Official Kemenag Letterhead inside Reader */}
                  <div className="border-b-2 border-slate-800 pb-4 flex items-center gap-4">
                    <KemenagLogoImg branding={branding} className="w-14 h-14 shrink-0" />
                    <div className="text-center flex-1">
                      <div className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-slate-900">
                        KEMENTERIAN AGAMA REPUBLIK INDONESIA
                      </div>
                      <div className="text-xs sm:text-sm font-bold uppercase text-emerald-900">
                        KANTOR KEMENTERIAN AGAMA KABUPATEN TOJO UNA-UNA
                      </div>
                      <div className="text-[11px] font-semibold text-slate-600">
                        PANITIA PELAKSANA HARI AMAL BAKTI (HAB) KE-81 TAHUN 2027
                      </div>
                    </div>
                  </div>

                  {(readingLetterState.letter.nomorSurat ||
                    readingLetterState.letter.perihalSurat) && (
                    <div className="text-xs sm:text-sm space-y-1 border-b border-slate-200 pb-3">
                      {readingLetterState.letter.nomorSurat && (
                        <div>
                          <span className="font-bold inline-block w-24">Nomor</span>:{' '}
                          {readingLetterState.letter.nomorSurat}
                        </div>
                      )}
                      {readingLetterState.letter.perihalSurat && (
                        <div>
                          <span className="font-bold inline-block w-24">Perihal</span>:{' '}
                          <span className="font-semibold">
                            {readingLetterState.letter.perihalSurat}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Full Letter Text Paragraphs */}
                  <div className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line font-serif">
                    {readingLetterState.letter.isiSuratTeks}
                  </div>
                </div>
              ) : (
                readingLetterState.letter.fileType === 'word' &&
                !readingLetterState.letter.externalUrl && (
                  <div className="p-6 rounded-xl bg-[#021b15] border border-emerald-800 text-center space-y-3">
                    <FileText className="w-10 h-10 text-amber-300 mx-auto" />
                    <div className="text-sm font-bold text-white">
                      Dokumen Surat Word: {readingLetterState.letter.fileName}
                    </div>
                    <p className="text-xs text-slate-300 max-w-md mx-auto">
                      Silakan klik tombol <strong>Unduh File Surat</strong> di bawah untuk membuka
                      dokumen Word ini di perangkat Anda.
                    </p>
                  </div>
                )
              )}
            </div>

            {/* Reader Footer */}
            <div className="px-5 py-3.5 bg-[#021b15] border-t border-emerald-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="text-slate-400">
                Diunggah: {readingLetterState.letter.waktuUpload} ·{' '}
                {readingLetterState.letter.fileName}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleShareSingleAnnouncementToWa(
                      readingLetterState.announcementText,
                      readingLetterState.announcementIndex
                    )
                  }
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Bagikan ke WA</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReadingLetterState(null)}
                  className="px-4 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold cursor-pointer"
                >
                  Selesai Membaca
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isStandalonePage) {
    return (
      <section
        aria-label="Halaman Web Khusus Pengumuman Resmi Panitia"
        className="px-4 sm:px-6 lg:px-8 pb-12"
      >
        {innerContent}
      </section>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="panitia-info-modal-title"
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
    >
      {innerContent}
    </div>
  );
};


