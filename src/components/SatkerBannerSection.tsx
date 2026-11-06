import React, { useEffect, useMemo, useState } from 'react';
import { SatkerBannerCategory, SatkerBannerItem } from '../types/hab';
import { compressBannerImageFile, normalizeBannerImageUrl } from '../utils/habLogic';
import { buildDeepLink, shareToWhatsAppWithFullImage } from '../utils/shareUtils';
import {
  Camera,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Edit3,
  Eye,
  Filter,
  Image as ImageIcon,
  Link2,
  Lock,
  Maximize2,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Share2,
  Trash2,
  Unlock,
  Upload,
  X,
} from 'lucide-react';

interface SatkerBannerSectionProps {
  banners: SatkerBannerItem[];
  satkerList: string[];
  adminPin?: string;
  isAdminUnlocked: boolean;
  onUnlockAdmin: () => void;
  onAddBanner: (banner: SatkerBannerItem, newSatkerName?: string) => void;
  onUpdateBanner: (id: string, partial: Partial<SatkerBannerItem>) => void;
  onDeleteBanner: (id: string) => void;
  onOpenAdminBannerTab: () => void;
}

export const DEFAULT_BANNER_CATEGORIES: SatkerBannerCategory[] = [
  'Spanduk & Banner Ucapan',
  'Persiapan Lomba',
  'Baksos',
  'Kunjungan Kerja',
  'Upacara & Seremonial',
];

// Normalize legacy category labels so existing local state maps cleanly to the new filter tabs
function normalizeCategoryName(cat: string): string {
  if (cat === 'Foto Persiapan Lomba') return 'Persiapan Lomba';
  if (cat === 'Dokumentasi Kegiatan & Baksos') return 'Baksos';
  return cat;
}

export const SatkerBannerSection: React.FC<SatkerBannerSectionProps> = ({
  banners,
  satkerList,
  adminPin = '812027',
  isAdminUnlocked,
  onUnlockAdmin,
  onAddBanner,
  onUpdateBanner,
  onDeleteBanner,
  onOpenAdminBannerTab,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [selectedSatkerFilter, setSelectedSatkerFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSubmitForm, setShowSubmitForm] = useState<boolean>(false);

  // Submission Form State
  const [satkerSelect, setSatkerSelect] = useState<string>(
    satkerList[0] || 'Kantor Kemenag Kab. Tojo Una-Una (Induk)'
  );
  const [isCustomSatker, setIsCustomSatker] = useState<boolean>(false);
  const [customSatker, setCustomSatker] = useState<string>('');
  const [kategori, setKategori] = useState<SatkerBannerCategory>('Spanduk & Banner Ucapan');
  const [isCustomKategori, setIsCustomKategori] = useState<boolean>(false);
  const [customKategori, setCustomKategori] = useState<string>('');
  const [judul, setJudul] = useState<string>('');
  const [inputMode, setInputMode] = useState<'upload' | 'url'>('upload');
  const [imageUrlInput, setImageUrlInput] = useState<string>('');
  const [uploadedDataUrl, setUploadedDataUrl] = useState<string>('');
  const [compressedKb, setCompressedKb] = useState<number | null>(null);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [bannerUcapan, setBannerUcapan] = useState<string>('');
  const [keterangan, setKeterangan] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Lightbox Modal State & Share Feedback
  const [lightboxItem, setLightboxItem] = useState<SatkerBannerItem | null>(null);
  const [copiedBannerId, setCopiedBannerId] = useState<string | null>(null);
  const [sharingBannerId, setSharingBannerId] = useState<string | null>(null);
  const [lastCreatedBanner, setLastCreatedBanner] = useState<SatkerBannerItem | null>(null);

  // Broken image fallback tracking
  const [brokenIds, setBrokenIds] = useState<Record<string, boolean>>({});

  // Auto-open Full-Screen Lightbox when visitor arrives via ?banner=<id>
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const bannerId = params.get('banner');
      if (bannerId && banners.length > 0) {
        const found = banners.find((b) => b.id === bannerId);
        if (found) {
          setLightboxItem(found);
          const el = document.getElementById('galeri-banner-satker');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
          }
        }
      }
    } catch {
      // Ignore URL parse errors
    }
  }, [banners]);

  const openBannerFullScreen = (item: SatkerBannerItem) => {
    setLightboxItem(item);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('banner', item.id);
      window.history.replaceState({}, '', url.toString());
    } catch {
      // Ignore
    }
  };

  const closeBannerFullScreen = () => {
    setLightboxItem(null);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('banner');
      window.history.replaceState({}, '', url.toString());
    } catch {
      // Ignore
    }
  };

  const handleCopyBannerLink = async (item: SatkerBannerItem) => {
    const link = buildDeepLink({ banner: item.id });
    try {
      await navigator.clipboard.writeText(link);
      setCopiedBannerId(item.id);
      window.setTimeout(() => setCopiedBannerId(null), 3000);
    } catch {
      setCopiedBannerId(item.id);
    }
  };

  const handleShareBannerToWa = async (item: SatkerBannerItem) => {
    setSharingBannerId(item.id);
    try {
      const link = buildDeepLink({ banner: item.id });
      const waText =
        `🎉 *${item.judul.toUpperCase()}*\n` +
        `🏛️ *Satker:* ${item.satker}\n` +
        `📂 *Kategori:* ${normalizeCategoryName(item.kategori)}\n` +
        (item.bannerUcapan ? `\n_"${item.bannerUcapan}"_\n` : '') +
        (item.keterangan ? `\n📝 ${item.keterangan}\n` : '') +
        `\n🔗 *Lihat Spanduk / Foto Ukuran Penuh (Full) di Portal Resmi HAB ke-81:*\n${link}`;

      await shareToWhatsAppWithFullImage({
        title: `${item.judul} — ${item.satker}`,
        waText,
        imageSrc: normalizeBannerImageUrl(item.imageUrl),
        fileName: `banner-${item.id}.jpg`,
      });
    } finally {
      setSharingBannerId(null);
    }
  };

  // Admin PIN Gate & Inline Edit State
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    type: 'edit' | 'delete';
    item: SatkerBannerItem;
  } | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSatker, setEditSatker] = useState<string>('');
  const [editKategori, setEditKategori] = useState<SatkerBannerCategory>('Spanduk & Banner Ucapan');
  const [editJudul, setEditJudul] = useState<string>('');
  const [editImageUrl, setEditImageUrl] = useState<string>('');
  const [editBannerUcapan, setEditBannerUcapan] = useState<string>('');
  const [editKeterangan, setEditKeterangan] = useState<string>('');

  // Dynamic category list combining standard categories + any custom categories present in data
  const allCategories = useMemo(() => {
    const set = new Set<string>(DEFAULT_BANNER_CATEGORIES);
    banners.forEach((b) => {
      if (b.kategori) {
        set.add(normalizeCategoryName(b.kategori));
      }
    });
    return Array.from(set);
  }, [banners]);

  // Count per category for filter tabs
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { Semua: 0 };
    allCategories.forEach((cat) => {
      counts[cat] = 0;
    });
    banners.forEach((item) => {
      if (!item.disetujui && !isAdminUnlocked) return;
      counts.Semua = (counts.Semua || 0) + 1;
      const normCat = normalizeCategoryName(item.kategori);
      counts[normCat] = (counts[normCat] || 0) + 1;
    });
    return counts;
  }, [banners, allCategories, isAdminUnlocked]);

  // Distinct Satkers present in banners for quick Satker filter dropdown
  const availableSatkers = useMemo(() => {
    const set = new Set<string>();
    banners.forEach((b) => {
      if (b.satker) set.add(b.satker);
    });
    return Array.from(set);
  }, [banners]);

  const visibleBanners = useMemo(() => {
    return banners.filter((item) => {
      if (!item.disetujui && !isAdminUnlocked) return false;
      const normCat = normalizeCategoryName(item.kategori);
      const matchesCat = selectedCategory === 'Semua' || normCat === selectedCategory;
      const matchesSatker =
        selectedSatkerFilter === 'ALL' || item.satker === selectedSatkerFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.satker.toLowerCase().includes(q) ||
        normCat.toLowerCase().includes(q) ||
        item.judul.toLowerCase().includes(q) ||
        (item.bannerUcapan || '').toLowerCase().includes(q) ||
        (item.keterangan || '').toLowerCase().includes(q);
      return matchesCat && matchesSatker && matchesSearch;
    });
  }, [banners, selectedCategory, selectedSatkerFilter, searchQuery, isAdminUnlocked]);

  const hasActiveFilter =
    selectedCategory !== 'Semua' ||
    selectedSatkerFilter !== 'ALL' ||
    searchQuery.trim().length > 0;

  const handleResetFilters = () => {
    setSelectedCategory('Semua');
    setSelectedSatkerFilter('ALL');
    setSearchQuery('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormError(null);
    setIsCompressing(true);
    try {
      const { dataUrl, sizeKb } = await compressBannerImageFile(file, 1280, 0.78);
      setUploadedDataUrl(dataUrl);
      setCompressedKb(sizeKb);
      if (!judul.trim()) {
        setJudul(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
      }
    } catch {
      setFormError('Gagal memproses file gambar. Silakan coba gambar lain atau gunakan Link URL.');
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const finalSatker = isCustomSatker ? customSatker.trim() : satkerSelect.trim();
    if (!finalSatker || finalSatker.length < 2) {
      setFormError('Silakan pilih atau ketik nama Satker / Madrasah terlebih dahulu.');
      return;
    }

    const finalKategori = isCustomKategori ? customKategori.trim() : kategori;
    if (!finalKategori) {
      setFormError('Silakan pilih atau ketik kategori dokumentasi kegiatan.');
      return;
    }

    if (!judul.trim() || judul.trim().length < 3) {
      setFormError('Judul Spanduk atau Foto Kegiatan wajib diisi (minimal 3 karakter).');
      return;
    }

    const rawImg =
      inputMode === 'upload' ? uploadedDataUrl : normalizeBannerImageUrl(imageUrlInput);
    if (!rawImg) {
      setFormError(
        inputMode === 'upload'
          ? 'Silakan pilih file gambar spanduk/foto dari perangkat Anda terlebih dahulu.'
          : 'Silakan masukkan Link URL gambar spanduk/foto terlebih dahulu.'
      );
      return;
    }

    const newItem: SatkerBannerItem = {
      id: `bnr-${Date.now()}`,
      satker: finalSatker,
      kategori: finalKategori,
      judul: judul.trim(),
      imageUrl: rawImg,
      bannerUcapan: bannerUcapan.trim() || undefined,
      keterangan: keterangan.trim() || undefined,
      waktuUpload: new Date().toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      disetujui: true,
    };

    onAddBanner(newItem, isCustomSatker ? finalSatker : undefined);
    setLastCreatedBanner(newItem);
    setJudul('');
    setImageUrlInput('');
    setUploadedDataUrl('');
    setCompressedKb(null);
    setBannerUcapan('');
    setKeterangan('');
    setSelectedCategory(finalKategori);
    setFormSuccess(
      `Dokumentasi "${newItem.judul}" (${finalKategori}) dari "${finalSatker}" berhasil ditampilkan. Anda dapat langsung menyalin link atau membagikan gambar penuhnya ke WhatsApp!`
    );
  };

  const startEditingItem = (item: SatkerBannerItem) => {
    setEditingId(item.id);
    setEditSatker(item.satker);
    setEditKategori(normalizeCategoryName(item.kategori));
    setEditJudul(item.judul);
    setEditImageUrl(item.imageUrl);
    setEditBannerUcapan(item.bannerUcapan || '');
    setEditKeterangan(item.keterangan || '');
  };

  const handleRequestAdminAction = (type: 'edit' | 'delete', item: SatkerBannerItem) => {
    if (isAdminUnlocked) {
      if (type === 'delete') {
        onDeleteBanner(item.id);
      } else {
        startEditingItem(item);
      }
      return;
    }
    setPendingAction({ type, item });
    setPinInput('');
    setPinError(null);
    setShowPinModal(true);
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === (adminPin || '812027')) {
      onUnlockAdmin();
      setShowPinModal(false);
      if (pendingAction) {
        if (pendingAction.type === 'delete') {
          onDeleteBanner(pendingAction.item.id);
        } else {
          startEditingItem(pendingAction.item);
        }
        setPendingAction(null);
      }
    } else {
      setPinError('Kode PIN Admin tidak sesuai.');
    }
  };

  const handleSaveEdit = (id: string) => {
    if (!editJudul.trim() || !editSatker.trim() || !editImageUrl.trim()) return;
    onUpdateBanner(id, {
      satker: editSatker.trim(),
      kategori: editKategori,
      judul: editJudul.trim(),
      imageUrl: normalizeBannerImageUrl(editImageUrl),
      bannerUcapan: editBannerUcapan.trim() || undefined,
      keterangan: editKeterangan.trim() || undefined,
    });
    setBrokenIds((prev) => ({ ...prev, [id]: false }));
    setEditingId(null);
  };

  return (
    <section
      id="spanduk-satker"
      aria-labelledby="spanduk-satker-heading"
      className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 border-t border-emerald-900/80"
    >
      {/* Header & Top Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <p className="text-xs font-semibold tracking-wider text-amber-300">
            Etalase Visual & Dokumentasi Kontingen se-Kabupaten Tojo Una-Una
          </p>
          <h2
            id="spanduk-satker-heading"
            className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight"
          >
            Galeri Spanduk, Banner Ucapan & Foto Kegiatan Satker
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Telusuri dokumentasi berdasarkan kategori kegiatan: Spanduk & Banner Ucapan, Persiapan
            Lomba, Baksos, Kunjungan Kerja, serta Upacara & Seremonial dari seluruh Satker Kemenag
            Kab. Tojo Una-Una.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowSubmitForm((prev) => !prev)}
            className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Camera className="w-4 h-4" />
            <span>
              {showSubmitForm ? 'Tutup Form Upload' : '+ Upload Spanduk / Foto Kegiatan Satker'}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenAdminBannerTab}
            className="px-3.5 py-2.5 rounded-xl bg-[#03251c] hover:bg-emerald-900/90 border border-emerald-700 text-emerald-200 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Settings className="w-3.5 h-3.5 text-amber-300" />
            <span>Kelola di Panel Admin</span>
          </button>
        </div>
      </div>

      {/* Collapsible Submission Form for Satker & Admin */}
      {showSubmitForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-[#03251c] border border-amber-400/50 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl"
        >
          <div className="flex items-center justify-between gap-4 border-b border-emerald-800 pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-amber-300">
                Formulir Kirim Spanduk Ucapan / Foto Persiapan & Kegiatan Satker
              </h3>
              <p className="text-xs text-slate-300">
                Pilih kategori kegiatan (Persiapan Lomba, Baksos, Kunjungan Kerja, atau Spanduk
                Ucapan) dan unggah foto dari HP/Laptop atau tempel Link URL.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowSubmitForm(false)}
              className="p-1.5 rounded-lg bg-[#021b15] text-slate-300 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {formError && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-rose-950/90 border border-rose-500/60 text-xs text-rose-200"
            >
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Satker Selection */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-200">
                  Asal Satker / KUA / Madrasah *
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomSatker((prev) => !prev)}
                  className="text-[11px] text-amber-300 hover:underline cursor-pointer"
                >
                  {isCustomSatker ? 'Pilih dari Daftar' : '+ Ketik Satker Baru'}
                </button>
              </div>
              {isCustomSatker ? (
                <input
                  type="text"
                  value={customSatker}
                  onChange={(e) => setCustomSatker(e.target.value)}
                  placeholder="Ketik nama Satker / Instansi..."
                  className="w-full px-3 py-2 rounded-lg bg-[#021b15] border border-emerald-700 text-xs text-white"
                />
              ) : (
                <select
                  value={satkerSelect}
                  onChange={(e) => setSatkerSelect(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#021b15] border border-emerald-700 text-xs text-white"
                >
                  {satkerList.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Category Selection */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-200">
                  Kategori Dokumentasi *
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomKategori((prev) => !prev)}
                  className="text-[11px] text-amber-300 hover:underline cursor-pointer"
                >
                  {isCustomKategori ? 'Pilih Kategori Utama' : '+ Kategori Lainnya'}
                </button>
              </div>
              {isCustomKategori ? (
                <input
                  type="text"
                  value={customKategori}
                  onChange={(e) => setCustomKategori(e.target.value)}
                  placeholder="Ketik kategori (mis. Rapat Panitia)..."
                  className="w-full px-3 py-2 rounded-lg bg-[#021b15] border border-emerald-700 text-xs text-white"
                />
              ) : (
                <select
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value as SatkerBannerCategory)}
                  className="w-full px-3 py-2 rounded-lg bg-[#021b15] border border-emerald-700 text-xs text-white"
                >
                  {allCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Title Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-200">
                Judul Spanduk / Nama Kegiatan *
              </label>
              <input
                type="text"
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                placeholder="Contoh: Persiapan Tim Voli KUA Ampana Kota"
                className="w-full px-3 py-2 rounded-lg bg-[#021b15] border border-emerald-700 text-xs text-white"
              />
            </div>
          </div>

          {/* Image Source Mode Switch (Upload File vs Link URL) */}
          <div className="p-4 rounded-xl bg-[#021b15] border border-emerald-800/90 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-amber-300">
                Pilih Sumber Gambar Spanduk / Foto Kegiatan *
              </span>
              <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#03251c] border border-emerald-800">
                <button
                  type="button"
                  onClick={() => setInputMode('upload')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    inputMode === 'upload'
                      ? 'bg-amber-400 text-slate-950 font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload File Gambar (Kompresi Otomatis)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('url')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    inputMode === 'url'
                      ? 'bg-amber-400 text-slate-950 font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Link URL Gambar / Google Drive</span>
                </button>
              </div>
            </div>

            {inputMode === 'upload' ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 border border-amber-400/50 text-amber-200 text-xs font-bold inline-flex items-center gap-2 cursor-pointer w-fit">
                  <Upload className="w-4 h-4" />
                  <span>
                    {isCompressing
                      ? 'Mengompresi Gambar...'
                      : uploadedDataUrl
                      ? 'Ganti File Gambar Spanduk/Foto'
                      : 'Pilih File Gambar dari HP / Komputer (.JPG, .PNG, .WEBP)'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                {compressedKb !== null && (
                  <span className="text-xs text-emerald-300 font-mono-tabular">
                    Ukuran setelah kompresi otomatis: ~{compressedKb} KB (Hemat memori portal)
                  </span>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <input
                  type="url"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  placeholder="Tempel Link URL Gambar atau Link Berbagi Google Drive (https://drive.google.com/file/d/...)"
                  className="w-full px-3 py-2 rounded-lg bg-[#03251c] border border-emerald-700 text-xs text-amber-200 font-mono-tabular"
                />
                <p className="text-[11px] text-slate-400">
                  Tips: Jika menggunakan Google Drive, pastikan akses file diatur ke &ldquo;Siapa
                  saja yang memiliki link&rdquo;.
                </p>
              </div>
            )}

            {/* Live Preview before submitting */}
            {(uploadedDataUrl || imageUrlInput.trim()) && (
              <div className="pt-2 flex items-center gap-3">
                <img
                  src={
                    inputMode === 'upload'
                      ? uploadedDataUrl
                      : normalizeBannerImageUrl(imageUrlInput)
                  }
                  alt="Pratinjau Spanduk Satker"
                  referrerPolicy="no-referrer"
                  className="h-20 w-36 object-cover rounded-lg border border-amber-400/50 bg-[#03251c]"
                />
                <div className="text-xs text-emerald-200 space-y-1">
                  <div className="font-semibold">Pratinjau Gambar Siap Ditampilkan</div>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedDataUrl('');
                      setImageUrlInput('');
                      setCompressedKb(null);
                    }}
                    className="text-[11px] text-rose-300 underline cursor-pointer"
                  >
                    Hapus Gambar Pilihan
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Optional bannerUcapan & keterangan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-200">
                Teks Banner Ucapan Satker (<code className="text-amber-300">bannerUcapan</code> —
                Opsional)
              </label>
              <input
                type="text"
                value={bannerUcapan}
                onChange={(e) => setBannerUcapan(e.target.value)}
                placeholder="Contoh: Keluarga Besar KUA Ratolindo Mengucapkan Dirgahayu HAB ke-81 Kemenag RI"
                className="w-full px-3 py-2 rounded-lg bg-[#021b15] border border-emerald-700 text-xs text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-200">
                Keterangan Kegiatan / Lokasi Foto (Opsional)
              </label>
              <input
                type="text"
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Contoh: Latihan rutin kontingen atau penyaluran paket baksos"
                className="w-full px-3 py-2 rounded-lg bg-[#021b15] border border-emerald-700 text-xs text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowSubmitForm(false)}
              className="px-4 py-2 rounded-xl bg-[#021b15] text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tayangkan Spanduk / Foto Satker</span>
            </button>
          </div>
        </form>
      )}

      {formSuccess && (
        <div className="p-4 rounded-xl bg-emerald-900/90 border border-amber-400/60 text-xs text-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
            <span>{formSuccess}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {lastCreatedBanner && (
              <button
                type="button"
                onClick={() => handleShareBannerToWa(lastCreatedBanner)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Bagikan ke WA (Full)</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setFormSuccess(null)}
              className="text-emerald-300 hover:text-white text-xs px-2 cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Interactive Category Filter Bar, Satker Filter & Search */}
      <div className="bg-[#03251c] border border-emerald-800/90 rounded-2xl p-4 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter Kategori Dokumentasi & Kegiatan:</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-300">
            <span className="font-mono-tabular">
              Menampilkan <strong className="text-white">{visibleBanners.length}</strong> dari{' '}
              <strong className="text-white">{categoryCounts.Semua || 0}</strong> dokumentasi
            </span>
            {hasActiveFilter && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-amber-300 hover:text-amber-200 underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filter</span>
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Tabs with Item Counts */}
        <div
          role="tablist"
          aria-label="Filter Kategori Spanduk dan Foto Kegiatan Satker"
          className="flex flex-wrap items-center gap-1.5"
        >
          {['Semua', ...allCategories].map((cat) => {
            const active = selectedCategory === cat;
            const count = categoryCounts[cat] ?? 0;
            return (
              <button
                key={cat}
                role="tab"
                aria-selected={active}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  active
                    ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                    : 'bg-[#021b15] text-slate-300 hover:text-white border border-emerald-800/80'
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`font-mono-tabular text-[11px] ${
                    active ? 'text-slate-900' : 'text-emerald-400'
                  }`}
                >
                  ({count})
                </span>
              </button>
            );
          })}
        </div>

        {/* Satker Filter Dropdown & Keyword Search */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <select
            aria-label="Filter Berdasarkan Satker"
            value={selectedSatkerFilter}
            onChange={(e) => setSelectedSatkerFilter(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-[#021b15] border border-emerald-800 text-xs text-white focus:outline-none focus:border-amber-400"
          >
            <option value="ALL">Semua Satker / Kontingen ({availableSatkers.length} Satker)</option>
            {availableSatkers.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              aria-label="Cari Spanduk, Kategori, atau Nama Satker"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul kegiatan, kategori, atau nama Satker..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#021b15] border border-emerald-800 text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>
      </div>

      {/* Banners & Activity Photos Grid */}
      {visibleBanners.length === 0 ? (
        <div className="bg-[#03251c]/70 border border-emerald-800/80 rounded-2xl p-10 text-center space-y-3">
          <ImageIcon className="w-8 h-8 text-amber-300 mx-auto" />
          <div className="text-sm font-bold text-white">
            Belum ada dokumentasi pada kategori &ldquo;{selectedCategory}&rdquo;
          </div>
          <p className="text-xs text-slate-300 max-w-md mx-auto">
            Silakan pilih kategori lain, klik &ldquo;Reset Filter&rdquo;, atau unggah dokumentasi
            baru melalui tombol &ldquo;+ Upload Spanduk / Foto Kegiatan Satker&rdquo;.
          </p>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Tampilkan Semua Kategori</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {visibleBanners.map((item) => {
            const isEditing = editingId === item.id;
            const isBroken = brokenIds[item.id];
            const displayUrl = normalizeBannerImageUrl(item.imageUrl);
            const normKategori = normalizeCategoryName(item.kategori);

            return (
              <article
                key={item.id}
                className="bg-[#03251c] border border-emerald-800/90 rounded-2xl overflow-hidden flex flex-col justify-between shadow-lg"
              >
                <div>
                  {/* Banner / Photo Visual Container */}
                  <div className="relative aspect-[16/7] bg-[#021b15] overflow-hidden group">
                    {!isBroken && displayUrl ? (
                      <img
                        src={displayUrl}
                        alt={item.judul}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setBrokenIds((prev) => ({
                            ...prev,
                            [item.id]: true,
                          }))
                        }
                        onClick={() => openBannerFullScreen(item)}
                        className="w-full h-full object-cover cursor-pointer transition-transform duration-200 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div
                        onClick={() => openBannerFullScreen(item)}
                        className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-[#022c22] via-[#064e3b] to-[#021b15] cursor-pointer"
                      >
                        <ImageIcon className="w-8 h-8 text-amber-300 mb-2" />
                        <div className="text-xs font-bold text-amber-200">{item.satker}</div>
                        <div className="text-sm font-bold text-white mt-0.5">{item.judul}</div>
                      </div>
                    )}

                    {/* Quick Zoom Button */}
                    <button
                      type="button"
                      onClick={() => openBannerFullScreen(item)}
                      className="absolute bottom-3 right-3 px-2.5 py-1.5 rounded-lg bg-black/75 hover:bg-black/90 text-amber-200 text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Perbesar Foto</span>
                    </button>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2 text-xs text-emerald-300">
                      <span className="font-semibold truncate">{item.satker}</span>
                      <span aria-hidden="true">·</span>
                      <button
                        type="button"
                        onClick={() => setSelectedCategory(normKategori)}
                        className="text-amber-300 hover:underline whitespace-nowrap cursor-pointer font-semibold"
                        title={`Filter kategori: ${normKategori}`}
                      >
                        {normKategori}
                      </button>
                      <span aria-hidden="true">·</span>
                      <span className="text-slate-400 whitespace-nowrap">{item.waktuUpload}</span>
                    </div>

                    <h3 className="text-base font-bold text-white leading-snug">{item.judul}</h3>

                    {item.bannerUcapan && (
                      <div className="p-3 rounded-xl bg-[#021b15] border border-amber-400/30 text-xs text-amber-200 italic leading-relaxed">
                        &ldquo;{item.bannerUcapan}&rdquo;
                      </div>
                    )}

                    {item.keterangan && (
                      <p className="text-xs text-slate-300 leading-relaxed">{item.keterangan}</p>
                    )}
                  </div>
                </div>

                {/* Card Footer with Lightbox View, WhatsApp Share & Admin Edit/Delete */}
                <div className="px-5 py-3 bg-[#021b15]/90 border-t border-emerald-800/80 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openBannerFullScreen(item)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#03251c] hover:bg-emerald-900 border border-emerald-700 text-[11px] text-emerald-200 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Tampil Full</span>
                    </button>
                    <button
                      type="button"
                      disabled={sharingBannerId === item.id}
                      onClick={() => handleShareBannerToWa(item)}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      title="Bagikan Gambar Spanduk Utuh (Full) + Link ke WhatsApp"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>
                        {sharingBannerId === item.id ? 'Menyiapkan...' : 'Bagikan WA (Full)'}
                      </span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleRequestAdminAction('edit', item)}
                      className="px-2.5 py-1 rounded-lg bg-[#03251c] hover:bg-emerald-900 border border-emerald-700 text-amber-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRequestAdminAction('delete', item)}
                      className="px-2.5 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>

                {/* Inline Admin Edit Drawer */}
                {isEditing && (
                  <div className="p-4 bg-[#021b15] border-t border-amber-400/50 space-y-3">
                    <div className="text-xs font-bold text-amber-300">
                      Edit Spanduk / Foto Kegiatan Satker (Mode Admin)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        value={editSatker}
                        onChange={(e) => setEditSatker(e.target.value)}
                        placeholder="Nama Satker"
                        className="px-2.5 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-xs text-white"
                      />
                      <select
                        value={editKategori}
                        onChange={(e) => setEditKategori(e.target.value as SatkerBannerCategory)}
                        className="px-2.5 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-xs text-white"
                      >
                        {allCategories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={editJudul}
                        onChange={(e) => setEditJudul(e.target.value)}
                        placeholder="Judul Spanduk / Foto"
                        className="sm:col-span-2 px-2.5 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-xs text-white"
                      />
                      <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={
                            editImageUrl.startsWith('data:')
                              ? 'Gambar Terkompresi Tersimpan (Klik Upload untuk ganti)'
                              : editImageUrl
                          }
                          onChange={(e) => setEditImageUrl(e.target.value)}
                          placeholder="Link URL Gambar Spanduk"
                          className="flex-1 px-2.5 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-xs text-amber-200 font-mono-tabular"
                        />
                        <label className="px-2.5 py-1.5 rounded bg-emerald-800 hover:bg-emerald-700 text-emerald-100 text-[11px] font-semibold flex items-center gap-1 cursor-pointer">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Ganti File Gambar</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const { dataUrl } = await compressBannerImageFile(file, 1280, 0.78);
                              setEditImageUrl(dataUrl);
                              e.target.value = '';
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                      <input
                        type="text"
                        value={editBannerUcapan}
                        onChange={(e) => setEditBannerUcapan(e.target.value)}
                        placeholder="Teks Banner Ucapan Satker (Opsional)"
                        className="sm:col-span-2 px-2.5 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-xs text-white"
                      />
                      <input
                        type="text"
                        value={editKeterangan}
                        onChange={(e) => setEditKeterangan(e.target.value)}
                        placeholder="Keterangan Tambahan (Opsional)"
                        className="sm:col-span-2 px-2.5 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-xs text-white"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1 rounded bg-[#03251c] text-slate-300 text-xs cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(item.id)}
                        className="px-3.5 py-1 rounded bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                      >
                        Simpan Perubahan
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {lightboxItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lightboxItem.judul}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
        >
          <div className="bg-[#03251c] border border-amber-400/60 rounded-2xl max-w-5xl w-full overflow-hidden shadow-2xl">
            <div className="px-5 py-3.5 bg-[#021b15] border-b border-emerald-800 flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-xs text-amber-300 font-semibold truncate">
                  {lightboxItem.satker} · {normalizeCategoryName(lightboxItem.kategori)}
                </div>
                <h3 className="text-base font-bold text-white truncate">{lightboxItem.judul}</h3>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleShareBannerToWa(lightboxItem)}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Bagikan ke WhatsApp (Gambar Full + Link)</span>
                </button>
                <a
                  href={normalizeBannerImageUrl(lightboxItem.imageUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={`Dokumentasi-${lightboxItem.satker.replace(/\s+/g, '-')}.jpg`}
                  className="px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-amber-200 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Gambar</span>
                </a>
                <button
                  type="button"
                  onClick={closeBannerFullScreen}
                  className="px-3 py-1.5 rounded-lg bg-emerald-950 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>Tutup</span>
                </button>
              </div>
            </div>

            <div className="p-4 bg-black/60 flex items-center justify-center max-h-[72vh] overflow-auto">
              <img
                src={normalizeBannerImageUrl(lightboxItem.imageUrl)}
                alt={lightboxItem.judul}
                referrerPolicy="no-referrer"
                className="max-h-[68vh] w-auto object-contain rounded-lg"
              />
            </div>

            {(lightboxItem.bannerUcapan || lightboxItem.keterangan) && (
              <div className="px-5 py-3.5 bg-[#021b15] border-t border-emerald-800 space-y-1">
                {lightboxItem.bannerUcapan && (
                  <p className="text-xs text-amber-200 italic">
                    &ldquo;{lightboxItem.bannerUcapan}&rdquo;
                  </p>
                )}
                {lightboxItem.keterangan && (
                  <p className="text-xs text-slate-300">{lightboxItem.keterangan}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin PIN Verification Modal */}
      {showPinModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="banner-pin-modal-title"
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
        >
          <div className="bg-[#03251c] border border-amber-400/60 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-emerald-800 pb-3">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                <Lock className="w-4 h-4" />
                <span id="banner-pin-modal-title">Otorisasi Admin — Kelola Spanduk Satker</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPinModal(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
            <p className="text-xs text-slate-300">
              Masukkan PIN Admin Panitia untuk mengedit atau menghapus spanduk/foto kegiatan
              Satker.
            </p>
            {pinError && (
              <div className="p-2.5 rounded-lg bg-rose-950 text-rose-300 text-xs">{pinError}</div>
            )}
            <form onSubmit={handleVerifyPin} className="flex gap-2">
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Masukkan PIN Admin"
                className="flex-1 px-3 py-2 rounded-lg bg-[#021b15] border border-emerald-700 text-xs text-white"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Verifikasi</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
