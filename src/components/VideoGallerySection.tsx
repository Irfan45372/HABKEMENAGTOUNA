import React, { useState } from 'react';
import { VideoItem } from '../types/hab';
import { extractYoutubeEmbedUrl } from '../utils/habLogic';
import {
  Check,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Film,
  Image as ImageIcon,
  Lock,
  Play,
  PlusCircle,
  Sparkles,
  Trash2,
  Unlock,
  Upload,
  X,
  Youtube,
} from 'lucide-react';

interface VideoGallerySectionProps {
  videos: VideoItem[];
  satkerList: string[];
  adminPin?: string;
  isAdminUnlocked?: boolean;
  onUnlockAdmin?: () => void;
  onAddVideo: (video: VideoItem) => void;
  onUpdateVideo?: (id: string, partial: Partial<VideoItem>) => void;
  onDeleteVideo?: (id: string) => void;
  onOpenAdminVideoTab?: () => void;
}

const VIDEO_CATEGORIES = [
  'Semua',
  'Live Streaming & Upacara',
  'Lomba Video Kreatif & Moderasi',
  'Profil & Inovasi Satker',
  'Dokumentasi Porseni & Baksos',
];

export const VideoGallerySection: React.FC<VideoGallerySectionProps> = ({
  videos,
  satkerList,
  adminPin = '812027',
  isAdminUnlocked = false,
  onUnlockAdmin,
  onAddVideo,
  onUpdateVideo,
  onDeleteVideo,
  onOpenAdminVideoTab,
}) => {
  const approvedVideos = videos.filter((v) => v.disetujui);
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [selectedSatkerFilter, setSelectedSatkerFilter] = useState<string>('Semua Satker');
  const [activeVideoId, setActiveVideoId] = useState<string>(() => approvedVideos[0]?.id || '');

  // Form Kirim Link YouTube Satker (Khusus Link YouTube untuk Pengguna Publik) + Banner Ucapan Satker (Opsional)
  const [showSubmitForm, setShowSubmitForm] = useState<boolean>(false);
  const [judul, setJudul] = useState<string>('');
  const [satker, setSatker] = useState<string>(
    satkerList[0] || 'Kantor Kemenag Kab. Tojo Una-Una (Induk)'
  );
  const [kategori, setKategori] = useState<string>('Lomba Video Kreatif & Moderasi');
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');
  const [durasiLabel, setDurasiLabel] = useState<string>('03:00');
  const [deskripsi, setDeskripsi] = useState<string>('');
  const [bannerUcapanTeks, setBannerUcapanTeks] = useState<string>('');
  const [bannerUcapanUrl, setBannerUcapanUrl] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Admin PIN Prompt & Inline Video Edit State (Admin Only)
  const [showPinPrompt, setShowPinPrompt] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [editJudul, setEditJudul] = useState<string>('');
  const [editSatker, setEditSatker] = useState<string>('');
  const [editYoutubeUrl, setEditYoutubeUrl] = useState<string>('');
  const [editDeskripsi, setEditDeskripsi] = useState<string>('');
  const [editBannerTeks, setEditBannerTeks] = useState<string>('');
  const [editBannerUrl, setEditBannerUrl] = useState<string>('');

  const filteredVideos = approvedVideos.filter((v) => {
    const matchCat = selectedCategory === 'Semua' || v.kategori === selectedCategory;
    const matchSatker =
      selectedSatkerFilter === 'Semua Satker' || v.satker === selectedSatkerFilter;
    return matchCat && matchSatker;
  });

  const activeVideo =
    filteredVideos.find((v) => v.id === activeVideoId) ||
    filteredVideos[0] ||
    approvedVideos[0] ||
    null;

  const handleBannerImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    targetSetter: (val: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2.5 * 1024 * 1024) {
      setUploadError('Ukuran gambar Banner Ucapan Satker maksimal 2,5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        targetSetter(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleVerifyAdminPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === (adminPin || '812027')) {
      setPinError(null);
      setPinInput('');
      setShowPinPrompt(false);
      if (onUnlockAdmin) onUnlockAdmin();
    } else {
      setPinError('PIN Admin tidak sesuai. Hanya Admin Panitia yang dapat mengedit/menghapus.');
    }
  };

  const handleStartAdminEdit = (vid: VideoItem) => {
    if (!isAdminUnlocked) {
      setShowPinPrompt(true);
      return;
    }
    setActiveVideoId(vid.id);
    setEditingVideoId(vid.id);
    setEditJudul(vid.judul);
    setEditSatker(vid.satker);
    setEditYoutubeUrl(vid.youtubeUrl || vid.videoFileUrl || '');
    setEditDeskripsi(vid.deskripsi || '');
    setEditBannerTeks(vid.bannerUcapanTeks || '');
    setEditBannerUrl(vid.bannerUcapanUrl || '');
  };

  const handleSaveAdminEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVideoId || !onUpdateVideo) return;
    const cleanUrl = editYoutubeUrl.trim();
    const isYt = Boolean(extractYoutubeEmbedUrl(cleanUrl));
    onUpdateVideo(editingVideoId, {
      judul: editJudul.trim() || 'Tayangan Video HAB ke-81',
      satker: editSatker.trim() || 'Kemenag Tojo Una-Una',
      sumberipe: isYt ? 'youtube' : 'direct_video',
      youtubeUrl: isYt ? cleanUrl : undefined,
      videoFileUrl: isYt ? undefined : cleanUrl,
      deskripsi: editDeskripsi.trim(),
      bannerUcapanTeks: editBannerTeks.trim() || undefined,
      bannerUcapanUrl: editBannerUrl.trim() || undefined,
    });
    setEditingVideoId(null);
  };

  const handleAdminDeleteVideo = (id: string) => {
    if (!isAdminUnlocked) {
      setShowPinPrompt(true);
      return;
    }
    if (onDeleteVideo) {
      onDeleteVideo(id);
      if (editingVideoId === id) {
        setEditingVideoId(null);
      }
    }
  };

  const handleSubmitVideo = (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    setUploadSuccess(null);

    if (!judul.trim() || judul.trim().length < 3) {
      setUploadError('Judul video wajib diisi (minimal 3 karakter).');
      return;
    }

    const embed = extractYoutubeEmbedUrl(youtubeUrl);
    if (!embed) {
      setUploadError(
        'Pengiriman langsung oleh pengguna hanya menerima Link YouTube resmi (contoh: https://www.youtube.com/watch?v=... atau https://youtu.be/...). Untuk upload file video .MP4 hanya dapat dilakukan oleh Admin Panitia.'
      );
      return;
    }

    const newItem: VideoItem = {
      id: `vid-${Date.now()}`,
      judul: judul.trim(),
      satker: satker.trim(),
      kategori,
      sumberipe: 'youtube',
      youtubeUrl: youtubeUrl.trim(),
      durasiLabel: durasiLabel.trim() || 'YouTube HD',
      deskripsi:
        deskripsi.trim() ||
        `Kiriman tayangan YouTube dokumentasi & publikasi dari kontingen ${satker.trim()}.`,
      bannerUcapanTeks: bannerUcapanTeks.trim() || undefined,
      bannerUcapanUrl: bannerUcapanUrl.trim() || undefined,
      waktuUpload: new Date().toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      disetujui: true,
    };

    onAddVideo(newItem);
    setActiveVideoId(newItem.id);
    setJudul('');
    setYoutubeUrl('');
    setDeskripsi('');
    setBannerUcapanTeks('');
    setBannerUcapanUrl('');
    setUploadSuccess(
      `Link YouTube "${newItem.judul}" berhasil ditambahkan ke Galeri Video HAB ke-81!`
    );
  };

  const activeEmbedUrl =
    activeVideo?.sumberipe === 'youtube' && activeVideo.youtubeUrl
      ? extractYoutubeEmbedUrl(activeVideo.youtubeUrl)
      : null;

  return (
    <section
      id="galeri-video"
      aria-label="Galeri Video Dokumentasi, Lomba Video Satker & Link YouTube"
      className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-emerald-900/70"
    >
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold text-amber-300 tracking-wide mb-1">
            05. Publikasi Visual, Lomba Video Kreatif & Live Streaming
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white [text-wrap:balance]">
            Galeri Video Satker & Tayangan YouTube HAB ke-81
          </h2>
          <p className="text-sm text-slate-300 mt-1.5 max-w-2xl">
            Tonton tayangan dokumentasi Porseni, profil pelayanan KUA & Madrasah Bersih (K3), video moderasi beragama, serta kirimkan Link YouTube & Banner Ucapan Satker Anda.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowSubmitForm((prev) => !prev)}
            className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md"
          >
            <PlusCircle className="w-4 h-4" />
            <span>
              {showSubmitForm ? 'Tutup Form Link YouTube' : '+ Kirim Link YouTube Satker'}
            </span>
          </button>

          {!isAdminUnlocked ? (
            <button
              type="button"
              onClick={() => setShowPinPrompt((prev) => !prev)}
              className="px-3.5 py-2.5 rounded-xl bg-[#03251c] hover:bg-emerald-900 border border-emerald-700 text-amber-300 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Akses Edit/Hapus Video (Admin)</span>
            </button>
          ) : (
            <span className="px-3 py-2 rounded-xl bg-emerald-900/90 border border-amber-400/50 text-amber-300 text-xs font-bold flex items-center gap-1.5">
              <Unlock className="w-3.5 h-3.5" />
              <span>Mode Admin Aktif (Bisa Edit & Hapus Video/Banner)</span>
            </span>
          )}

          {onOpenAdminVideoTab && (
            <button
              type="button"
              onClick={onOpenAdminVideoTab}
              className="px-3.5 py-2.5 rounded-xl bg-[#03251c] hover:bg-emerald-900 border border-emerald-700 text-emerald-200 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>Upload MP4 (Panel Admin)</span>
            </button>
          )}
        </div>
      </div>

      {/* Inline Admin PIN Prompt for Deleting/Editing Displayed Videos */}
      {showPinPrompt && !isAdminUnlocked && (
        <form
          onSubmit={handleVerifyAdminPin}
          className="mb-6 bg-[#021b15] border-2 border-amber-400/70 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2 text-xs text-slate-200">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Masukkan <strong>PIN Rahasia Admin</strong> untuk mengaktifkan tombol <strong>Edit & Hapus</strong> pada Video/YouTube & Banner Ucapan yang tampil:
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {pinError && <span className="text-xs text-rose-300">{pinError}</span>}
            <input
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="PIN Admin"
              className="px-3 py-1.5 rounded-lg bg-[#03251c] border border-emerald-700 text-xs text-white font-mono-tabular w-36"
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs cursor-pointer"
            >
              Buka Akses Admin
            </button>
            <button
              type="button"
              onClick={() => {
                setShowPinPrompt(false);
                setPinError(null);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-950 text-slate-300 text-xs cursor-pointer"
            >
              Batal
            </button>
          </div>
        </form>
      )}

      {/* Collapsible Public / Satker YouTube Link + Optional Banner Ucapan Submission Form */}
      {showSubmitForm && (
        <form
          onSubmit={handleSubmitVideo}
          className="mb-8 bg-[#03251c] border-2 border-amber-400/60 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Film className="w-4 h-4 text-amber-400" />
                Formulir Pengiriman Link YouTube & Banner Ucapan Satker (Opsional)
              </h3>
              <p className="text-xs text-emerald-300 mt-0.5">
                Pengguna & kontingen Satker dapat langsung mengirimkan tautan video YouTube beserta Banner Ucapan Satker (opsional). Untuk unggah file video (.MP4) dikhususkan bagi Admin Panitia.
              </p>
            </div>
            {onOpenAdminVideoTab && (
              <button
                type="button"
                onClick={onOpenAdminVideoTab}
                className="px-3 py-1.5 rounded-lg bg-[#021b15] hover:bg-emerald-950 border border-amber-400/40 text-amber-300 text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-3 h-3" />
                <span>Upload File MP4 (Login Admin)</span>
              </button>
            )}
          </div>

          {uploadError && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-rose-950/90 border border-rose-500/50 text-xs text-rose-200"
            >
              {uploadError}
            </div>
          )}

          {uploadSuccess && (
            <div
              role="status"
              className="p-3 rounded-lg bg-emerald-900/90 border border-emerald-400/50 text-xs text-emerald-100 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
              <span>{uploadSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Judul Video / Tayangan YouTube *
              </label>
              <input
                type="text"
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                placeholder="Contoh: Profil Layanan KUA Ampana Kota - Lomba K3 HAB-81"
                className="w-full px-3 py-2 rounded-lg bg-[#021b15] border border-emerald-700 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Asal Satker / Kontingen *
              </label>
              <select
                value={satker}
                onChange={(e) => setSatker(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#021b15] border border-emerald-700 text-xs text-white"
              >
                {satkerList.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Kategori Video
              </label>
              <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#021b15] border border-emerald-700 text-xs text-white"
              >
                {VIDEO_CATEGORIES.filter((c) => c !== 'Semua').map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Input Link YouTube Pengguna */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start pt-1">
            <div className="lg:col-span-9">
              <label className="block text-xs font-semibold text-amber-300 mb-1 flex items-center gap-1.5">
                <Youtube className="w-4 h-4 text-amber-400" />
                <span>URL / Link Video YouTube (Watch / Shorts / Live / Youtu.be) *</span>
              </label>
              <input
                type="text"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... atau https://youtu.be/..."
                className="w-full px-3 py-2 rounded-lg bg-[#021b15] border border-emerald-700 text-xs text-white font-mono-tabular"
              />
            </div>

            <div className="lg:col-span-3">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Estimasi Durasi (Menit:Detik)
              </label>
              <input
                type="text"
                value={durasiLabel}
                onChange={(e) => setDurasiLabel(e.target.value)}
                placeholder="Contoh: 03:30"
                className="w-full px-3 py-2 rounded-lg bg-[#021b15] border border-emerald-700 text-xs text-white font-mono-tabular"
              />
            </div>
          </div>

          {/* Optional Banner Ucapan Satker Section */}
          <div className="bg-[#021b15]/90 border border-emerald-800/80 rounded-xl p-3.5 space-y-2.5">
            <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Banner / Spanduk Ucapan Satker (Opsional — Boleh Dikosongkan)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">
                  Teks Banner Ucapan Satker (Opsional)
                </label>
                <input
                  type="text"
                  value={bannerUcapanTeks}
                  onChange={(e) => setBannerUcapanTeks(e.target.value)}
                  placeholder="Contoh: Selamat HAB ke-81 Kemenag RI — KUA Ampana Kota Siap Melayani"
                  className="w-full px-3 py-1.5 rounded-lg bg-[#03251c] border border-emerald-700 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">
                  Gambar Banner / Spanduk Satker (Opsional: Upload JPG/PNG atau Link)
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={bannerUcapanUrl}
                    onChange={(e) => setBannerUcapanUrl(e.target.value)}
                    placeholder="Kosongkan atau tempel URL gambar banner..."
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#03251c] border border-emerald-700 text-xs text-white min-w-0"
                  />
                  <label className="px-2.5 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-amber-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer shrink-0">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Pilih Gambar</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleBannerImageUpload(e, setBannerUcapanUrl)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Deskripsi Singkat Tayangan
              </label>
              <input
                type="text"
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                placeholder="Ringkasan isi video / pesan kerukunan kontingen..."
                className="w-full px-3 py-2 rounded-lg bg-[#021b15] border border-emerald-700 text-xs text-white"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <Youtube className="w-4 h-4" />
              <span>Kirim & Tayangkan Link YouTube</span>
            </button>
          </div>
        </form>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap items-center gap-1.5">
          {VIDEO_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                selectedCategory === cat
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-[#03251c] text-slate-300 hover:text-white border border-emerald-800/70'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <select
          aria-label="Filter Video berdasarkan Satker"
          value={selectedSatkerFilter}
          onChange={(e) => setSelectedSatkerFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-[#03251c] border border-emerald-800 text-xs text-amber-200"
        >
          <option value="Semua Satker">Semua Satker ({approvedVideos.length} Video)</option>
          {satkerList.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Main Player + Playlist Grid */}
      {filteredVideos.length === 0 ? (
        <div className="bg-[#03251c] border border-emerald-800/80 rounded-2xl p-8 text-center text-sm text-slate-300">
          Belum ada tayangan video pada kategori/satker ini. Klik tombol{' '}
          <strong className="text-amber-300">+ Kirim Link YouTube Satker</strong> di atas untuk menambahkan.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 7 Cols: Active Video Player + Optional Satker Banner + Admin Edit/Delete */}
          <div className="lg:col-span-7 bg-[#03251c] border border-emerald-800/80 rounded-2xl overflow-hidden shadow-xl max-h-[560px] overflow-y-auto">
            <div className="aspect-video w-full bg-black relative">
              {activeEmbedUrl ? (
                <iframe
                  title={activeVideo?.judul || 'Tayangan Video HAB ke-81'}
                  src={activeEmbedUrl}
                  loading="lazy"
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : activeVideo?.videoFileUrl ? (
                <video
                  key={activeVideo.id}
                  src={activeVideo.videoFileUrl}
                  preload="metadata"
                  controls
                  className="w-full h-full object-contain bg-black"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                  Pilih video untuk diputar
                </div>
              )}
            </div>

            {activeVideo && (
              <div className="p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-amber-300 font-semibold">
                    {activeVideo.kategori} · {activeVideo.satker}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono-tabular text-emerald-300">
                      Durasi: {activeVideo.durasiLabel || '03:00'} · {activeVideo.waktuUpload}
                    </span>
                    {/* Direct Admin Edit & Delete Buttons on Active Video */}
                    <button
                      type="button"
                      onClick={() => handleStartAdminEdit(activeVideo)}
                      className="px-2.5 py-1 rounded bg-[#021b15] hover:bg-emerald-900 border border-emerald-700 text-amber-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                      title="Edit Video / Banner Ucapan (Khusus Admin)"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit (Admin)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdminDeleteVideo(activeVideo.id)}
                      className="px-2.5 py-1 rounded bg-rose-950/90 hover:bg-rose-900 border border-rose-500/40 text-rose-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                      title="Hapus Video/YouTube Ini (Khusus Admin)"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Hapus (Admin)</span>
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-white">{activeVideo.judul}</h3>

                {activeVideo.deskripsi && (
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {activeVideo.deskripsi}
                  </p>
                )}

                {/* Optional Banner Ucapan Satker Display */}
                {(activeVideo.bannerUcapanTeks || activeVideo.bannerUcapanUrl) && (
                  <div className="mt-2 bg-gradient-to-r from-[#021b15] via-[#064e3b] to-[#021b15] border border-amber-400/60 rounded-xl p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>BANNER UCAPAN RESMI SATKER — {activeVideo.satker}</span>
                      </span>
                      {isAdminUnlocked && onUpdateVideo && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateVideo(activeVideo.id, {
                              bannerUcapanTeks: undefined,
                              bannerUcapanUrl: undefined,
                            })
                          }
                          className="text-[11px] text-rose-300 hover:text-rose-200 flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Hapus Banner</span>
                        </button>
                      )}
                    </div>
                    {activeVideo.bannerUcapanUrl && (
                      <img
                        src={activeVideo.bannerUcapanUrl}
                        alt={`Banner Ucapan ${activeVideo.satker}`}
                        loading="lazy"
                        decoding="async"
                        className="w-full max-h-44 object-cover rounded-lg border border-amber-400/40"
                      />
                    )}
                    {activeVideo.bannerUcapanTeks && (
                      <p className="text-xs sm:text-sm font-semibold text-white">
                        “{activeVideo.bannerUcapanTeks}”
                      </p>
                    )}
                  </div>
                )}

                {/* Inline Admin Editor for Active Video & Optional Banner */}
                {isAdminUnlocked && editingVideoId === activeVideo.id && (
                  <form
                    onSubmit={handleSaveAdminEdit}
                    className="mt-3 bg-[#021b15] border-2 border-amber-400/70 rounded-xl p-4 space-y-3 text-xs"
                  >
                    <div className="flex items-center justify-between border-b border-emerald-800 pb-2">
                      <span className="font-bold text-amber-300">
                        Edit Video / Link YouTube & Banner Ucapan Satker (Admin)
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingVideoId(null)}
                        className="text-slate-400 hover:text-white cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] text-slate-300 mb-1">
                          Judul Video
                        </label>
                        <input
                          type="text"
                          value={editJudul}
                          onChange={(e) => setEditJudul(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-300 mb-1">
                          Satker Pengirim
                        </label>
                        <input
                          type="text"
                          value={editSatker}
                          onChange={(e) => setEditSatker(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-white"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] text-slate-300 mb-1">
                          Link YouTube / URL Video
                        </label>
                        <input
                          type="text"
                          value={editYoutubeUrl}
                          onChange={(e) => setEditYoutubeUrl(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-amber-300 font-mono-tabular"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] text-slate-300 mb-1">
                          Deskripsi Video
                        </label>
                        <input
                          type="text"
                          value={editDeskripsi}
                          onChange={(e) => setEditDeskripsi(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-amber-300 mb-1">
                          Teks Banner Ucapan Satker (Opsional)
                        </label>
                        <input
                          type="text"
                          value={editBannerTeks}
                          onChange={(e) => setEditBannerTeks(e.target.value)}
                          placeholder="Kosongkan jika tanpa banner teks"
                          className="w-full px-2.5 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-amber-300 mb-1">
                          Gambar Banner Ucapan Satker (Opsional)
                        </label>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={editBannerUrl}
                            onChange={(e) => setEditBannerUrl(e.target.value)}
                            placeholder="URL gambar banner atau kosongkan"
                            className="flex-1 px-2.5 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-white min-w-0"
                          />
                          <label className="px-2 py-1.5 rounded bg-emerald-800 text-amber-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer shrink-0">
                            <Upload className="w-3 h-3" />
                            <span>Gambar</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleBannerImageUpload(e, setEditBannerUrl)}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingVideoId(null)}
                        className="px-3 py-1.5 rounded bg-emerald-950 text-slate-300 cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded bg-amber-400 text-slate-950 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Simpan Perubahan</span>
                      </button>
                    </div>
                  </form>
                )}

                {activeVideo.youtubeUrl && (
                  <div className="pt-1">
                    <a
                      href={activeVideo.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300 hover:text-amber-200 underline underline-offset-4"
                    >
                      <Youtube className="w-4 h-4" />
                      <span>Tonton Langsung di YouTube</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right 5 Cols: Playlist Directory with Admin Delete/Edit Controls */}
          <div className="lg:col-span-5 bg-[#03251c] border border-emerald-800/80 rounded-2xl p-4 space-y-3 max-h-[540px] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-emerald-800/70 pb-2.5">
              <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                Daftar Tayangan Video Satker ({filteredVideos.length})
              </h3>
              <span className="text-[10px] text-emerald-300">
                {isAdminUnlocked ? 'Klik Edit/Hapus untuk mengelola' : 'Hapus: Khusus Admin'}
              </span>
            </div>

            <div className="space-y-2.5">
              {filteredVideos.map((vid) => {
                const isPlaying = vid.id === activeVideo?.id;
                return (
                  <div
                    key={vid.id}
                    className={`p-3 rounded-xl border transition-colors flex items-start justify-between gap-2 ${
                      isPlaying
                        ? 'bg-[#043327] border-amber-400/70'
                        : 'bg-[#021b15] border-emerald-800/60 hover:border-emerald-600'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveVideoId(vid.id)}
                      className="flex items-start gap-3 text-left min-w-0 flex-1 cursor-pointer"
                    >
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          isPlaying
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-emerald-900/70 text-amber-300'
                        }`}
                      >
                        <Play className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white line-clamp-2">
                          {vid.judul}
                        </div>
                        <div className="text-[11px] text-amber-300/90 mt-0.5 truncate">
                          {vid.satker}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5 font-mono-tabular">
                          <span>{vid.kategori}</span>
                          <span>·</span>
                          <span>{vid.durasiLabel || 'YouTube'}</span>
                          {(vid.bannerUcapanTeks || vid.bannerUcapanUrl) && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300">
                              +Banner Satker
                            </span>
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Admin-Only Edit & Delete Buttons on Each Playlist Item */}
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartAdminEdit(vid)}
                        title="Edit Video / Banner (Khusus Admin)"
                        className="p-1.5 rounded bg-[#03251c] hover:bg-emerald-900 border border-emerald-700 text-amber-300 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdminDeleteVideo(vid.id)}
                        title="Hapus Video Ini (Khusus Admin)"
                        className="p-1.5 rounded bg-rose-950/90 hover:bg-rose-900 text-rose-300 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
