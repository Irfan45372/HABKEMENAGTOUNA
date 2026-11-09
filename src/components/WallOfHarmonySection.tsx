import React, { useMemo, useState } from 'react';
import { HarmonyMessage } from '../types/hab';
import {
  Check,
  CheckCircle2,
  Edit3,
  Image as ImageIcon,
  Lock,
  MessageSquareHeart,
  Send,
  Trash2,
  Unlock,
  Upload,
  X,
} from 'lucide-react';

interface WallOfHarmonySectionProps {
  messages: HarmonyMessage[];
  satkerList: string[];
  adminPin?: string;
  isAdminUnlocked?: boolean;
  onUnlockAdmin?: () => void;
  onAddMessage: (msg: HarmonyMessage) => void;
  onUpdateMessage?: (id: string, partial: Partial<HarmonyMessage>) => void;
  onDeleteMessage?: (id: string) => void;
}

export const WallOfHarmonySection: React.FC<WallOfHarmonySectionProps> = ({
  messages,
  satkerList,
  adminPin = '812027',
  isAdminUnlocked = false,
  onUnlockAdmin,
  onAddMessage,
  onUpdateMessage,
  onDeleteMessage,
}) => {
  const [nama, setNama] = useState<string>('');
  const [jabatanAtauSatker, setJabatanAtauSatker] = useState<string>(
    satkerList[0] || 'Kantor Kemenag Kab. Tojo Una-Una'
  );
  const [kategori, setKategori] = useState<HarmonyMessage['kategori']>(
    'Ucapan Selamat HAB ke-81'
  );
  const [pesan, setPesan] = useState<string>('');
  const [bannerImageUrl, setBannerImageUrl] = useState<string>('');
  const [filterKat, setFilterKat] = useState<string>('Semua');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Admin PIN Prompt & Inline Edit State for Ucapan & Banner Satker (Admin Only)
  const [showPinPrompt, setShowPinPrompt] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editNama, setEditNama] = useState<string>('');
  const [editSatker, setEditSatker] = useState<string>('');
  const [editPesan, setEditPesan] = useState<string>('');
  const [editBannerUrl, setEditBannerUrl] = useState<string>('');

  const approvedMessages = useMemo(() => {
    const approved = messages.filter((m) => m.disetujui);
    if (filterKat === 'Semua') return approved;
    return approved.filter((m) => m.kategori === filterKat);
  }, [messages, filterKat]);

  const handleBannerUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2.5 * 1024 * 1024) {
      setErrorMsg('Ukuran file Gambar Banner Ucapan Satker maksimal 2,5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setter(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === (adminPin || '812027')) {
      setPinError(null);
      setPinInput('');
      setShowPinPrompt(false);
      if (onUnlockAdmin) onUnlockAdmin();
    } else {
      setPinError('PIN Admin tidak sesuai. Hanya Admin yang dapat mengedit/menghapus.');
    }
  };

  const handleStartEditMsg = (msg: HarmonyMessage) => {
    if (!isAdminUnlocked) {
      setShowPinPrompt(true);
      return;
    }
    setEditingMsgId(msg.id);
    setEditNama(msg.nama);
    setEditSatker(msg.jabatanAtauSatker);
    setEditPesan(msg.pesan);
    setEditBannerUrl(msg.bannerImageUrl || '');
  };

  const handleSaveEditMsg = (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (!onUpdateMessage) return;
    onUpdateMessage(id, {
      nama: editNama.trim() || 'Keluarga Besar Kemenag Touna',
      jabatanAtauSatker: editSatker.trim() || 'Kabupaten Tojo Una-Una',
      pesan: editPesan.trim(),
      bannerImageUrl: editBannerUrl.trim() || undefined,
    });
    setEditingMsgId(null);
  };

  const handleAdminDeleteMsg = (id: string) => {
    if (!isAdminUnlocked) {
      setShowPinPrompt(true);
      return;
    }
    if (onDeleteMessage) {
      onDeleteMessage(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!nama || nama.trim().length < 2) {
      setErrorMsg('Mohon isi Nama Pengirim terlebih dahulu.');
      return;
    }
    if (!pesan || pesan.trim().length < 8) {
      setErrorMsg('Pesan ucapan atau saran minimal 8 karakter.');
      return;
    }

    const newMsg: HarmonyMessage = {
      id: `msg-${Date.now()}`,
      nama: nama.trim(),
      jabatanAtauSatker: jabatanAtauSatker.trim() || 'Masyarakat Tojo Una-Una',
      kategori,
      pesan: pesan.trim(),
      bannerImageUrl: bannerImageUrl.trim() || undefined,
      waktu: new Date().toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      disetujui: true,
    };

    onAddMessage(newMsg);
    setNama('');
    setPesan('');
    setBannerImageUrl('');
    setSuccessMsg(
      'Terima kasih! Ucapan & Banner Satker Anda telah tampil di Dinding Kerukunan (Wall of Harmony).'
    );
  };

  return (
    <section
      id="aspirasi-ucapan"
      aria-label="Kotak Saran, Aspirasi dan Wall of Harmony"
      className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-emerald-900/70"
    >
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold text-amber-300 tracking-wide mb-1">
            06. Suara Umat, Banner Ucapan Satker & Keluarga Besar Kementerian Agama
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white [text-wrap:balance]">
            Kotak Saran, Aspirasi & Dinding Banner Ucapan Satker
          </h2>
          <p className="text-sm text-slate-300 mt-1.5 max-w-2xl">
            Sampaikan doa, ucapan selamat Hari Amal Bakti ke-81, serta lampirkan Banner/Spanduk Ucapan Satker (opsional) untuk menyemarakkan HAB ke-81 di Kabupaten Tojo Una-Una.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter Buttons */}
          <div
            role="tablist"
            aria-label="Filter Kategori Ucapan"
            className="flex flex-wrap items-center gap-1.5 bg-[#03221a] p-1.5 rounded-xl border border-emerald-800/80"
          >
            {[
              'Semua',
              'Ucapan Selamat HAB ke-81',
              'Doa Kerukunan Umat',
              'Aspirasi & Saran Panitia',
            ].map((k) => (
              <button
                key={k}
                role="tab"
                aria-selected={filterKat === k}
                type="button"
                onClick={() => setFilterKat(k)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  filterKat === k
                    ? 'bg-amber-400 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {k}
              </button>
            ))}
          </div>

          {!isAdminUnlocked ? (
            <button
              type="button"
              onClick={() => setShowPinPrompt((prev) => !prev)}
              className="px-3 py-2 rounded-xl bg-[#03251c] hover:bg-emerald-900 border border-emerald-700 text-amber-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Edit/Hapus (Admin)</span>
            </button>
          ) : (
            <span className="px-3 py-2 rounded-xl bg-emerald-900/90 border border-amber-400/50 text-amber-300 text-xs font-bold flex items-center gap-1.5">
              <Unlock className="w-3.5 h-3.5" />
              <span>Admin Aktif</span>
            </span>
          )}
        </div>
      </div>

      {/* Inline Admin PIN Prompt */}
      {showPinPrompt && !isAdminUnlocked && (
        <form
          onSubmit={handleVerifyPin}
          className="mb-6 bg-[#021b15] border-2 border-amber-400/70 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2 text-xs text-slate-200">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Masukkan <strong>PIN Rahasia Admin</strong> untuk mengedit atau menghapus Ucapan & Banner Satker:
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 5 Cols: Submission Form with Optional Banner Ucapan Satker */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-5 bg-[#03251c] border border-emerald-800/80 rounded-2xl p-6 space-y-4"
        >
          <div className="border-b border-emerald-800/70 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <MessageSquareHeart className="w-4 h-4 text-amber-400" />
              Kirim Ucapan Selamat & Banner Satker (Opsional)
            </h3>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-rose-950/90 border border-rose-500/60 text-xs text-rose-200"
            >
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div
              role="status"
              className="p-3 rounded-lg bg-emerald-900/90 border border-emerald-400/60 text-xs text-emerald-100 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="harmony-name"
              className="block text-xs font-semibold text-slate-200 mb-1"
            >
              Nama Pengirim / Keluarga Besar *
            </label>
            <input
              id="harmony-name"
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Contoh: Keluarga Besar KUA Kec. Ulubongka"
              className="w-full px-3.5 py-2 rounded-lg bg-[#021b15] border border-emerald-700/80 text-sm text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label
              htmlFor="harmony-satker"
              className="block text-xs font-semibold text-slate-200 mb-1"
            >
              Jabatan / Satuan Kerja / Instansi
            </label>
            <input
              id="harmony-satker"
              type="text"
              list="harmony-satker-options"
              value={jabatanAtauSatker}
              onChange={(e) => setJabatanAtauSatker(e.target.value)}
              placeholder="Ketik atau pilih Satker..."
              className="w-full px-3.5 py-2 rounded-lg bg-[#021b15] border border-emerald-700/80 text-sm text-white focus:outline-none focus:border-amber-400"
            />
            <datalist id="harmony-satker-options">
              {satkerList.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>

          <div>
            <label
              htmlFor="harmony-category"
              className="block text-xs font-semibold text-slate-200 mb-1"
            >
              Kategori Pesan *
            </label>
            <select
              id="harmony-category"
              value={kategori}
              onChange={(e) =>
                setKategori(e.target.value as HarmonyMessage['kategori'])
              }
              className="w-full px-3.5 py-2 rounded-lg bg-[#021b15] border border-emerald-700/80 text-sm text-white focus:outline-none focus:border-amber-400"
            >
              <option value="Ucapan Selamat HAB ke-81">Ucapan Selamat HAB ke-81</option>
              <option value="Doa Kerukunan Umat">Doa Kerukunan Umat</option>
              <option value="Aspirasi & Saran Panitia">Aspirasi & Saran Panitia</option>
            </select>
          </div>

          {/* Optional Banner Ucapan Satker Input */}
          <div className="bg-[#021b15] border border-emerald-800/80 rounded-xl p-3 space-y-2">
            <label className="block text-xs font-semibold text-amber-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" />
                Banner / Spanduk Ucapan Satker (Opsional)
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Boleh Dikosongkan</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={bannerImageUrl}
                onChange={(e) => setBannerImageUrl(e.target.value)}
                placeholder="Tempel URL gambar banner atau unggah file..."
                className="flex-1 px-3 py-1.5 rounded-lg bg-[#03251c] border border-emerald-700 text-xs text-white min-w-0"
              />
              <label className="px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-amber-200 text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0">
                <Upload className="w-3.5 h-3.5" />
                <span>Unggah</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleBannerUpload(e, setBannerImageUrl)}
                  className="hidden"
                />
              </label>
            </div>
            {bannerImageUrl && (
              <div className="relative pt-1">
                <img
                  src={bannerImageUrl}
                  alt="Pratinjau Banner Satker"
                  className="w-full h-24 object-cover rounded-lg border border-amber-400/50"
                />
                <button
                  type="button"
                  onClick={() => setBannerImageUrl('')}
                  className="absolute top-2 right-2 px-2 py-0.5 rounded bg-rose-950/90 text-rose-200 text-[10px] cursor-pointer"
                >
                  Hapus Banner
                </button>
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="harmony-message"
              className="block text-xs font-semibold text-slate-200 mb-1"
            >
              Isi Ucapan / Doa / Aspirasi *
            </label>
            <textarea
              id="harmony-message"
              rows={4}
              value={pesan}
              onChange={(e) => setPesan(e.target.value)}
              placeholder="Tuliskan doa, harapan, atau saran untuk peringatan HAB ke-81 Kemenag Kab. Tojo Una-Una..."
              className="w-full px-3.5 py-2 rounded-lg bg-[#021b15] border border-emerald-700/80 text-sm text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
          >
            <Send className="w-4 h-4" />
            <span>Kirim ke Dinding Kerukunan</span>
          </button>
        </form>

        {/* Right 7 Cols: Live Wall of Harmony & Satker Banners */}
        <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[680px] overflow-y-auto pr-1 content-start">
          {approvedMessages.map((msg) => {
            const isEditing = isAdminUnlocked && editingMsgId === msg.id;
            return (
              <article
                key={msg.id}
                className="bg-[#03251c] border border-emerald-800/80 rounded-2xl p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-amber-300 font-semibold">{msg.kategori}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 font-mono-tabular">{msg.waktu}</span>
                      <button
                        type="button"
                        onClick={() => handleStartEditMsg(msg)}
                        title="Edit Ucapan / Banner Satker (Khusus Admin)"
                        className="p-1 rounded bg-[#021b15] hover:bg-emerald-900 border border-emerald-700 text-amber-300 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdminDeleteMsg(msg.id)}
                        title="Hapus Ucapan / Banner Ini (Khusus Admin)"
                        className="p-1 rounded bg-rose-950/90 hover:bg-rose-900 text-rose-300 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Optional Satker Banner Image */}
                  {msg.bannerImageUrl && (
                    <div className="rounded-xl overflow-hidden border border-amber-400/50 bg-[#021b15]">
                      <img
                        src={msg.bannerImageUrl}
                        alt={`Banner Ucapan ${msg.jabatanAtauSatker}`}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-36 object-cover"
                      />
                    </div>
                  )}

                  {isEditing ? (
                    <form
                      onSubmit={(e) => handleSaveEditMsg(e, msg.id)}
                      className="space-y-2 pt-2 border-t border-emerald-800 text-xs"
                    >
                      <input
                        type="text"
                        value={editNama}
                        onChange={(e) => setEditNama(e.target.value)}
                        placeholder="Nama Pengirim"
                        className="w-full px-2.5 py-1.5 rounded bg-[#021b15] border border-emerald-700 text-white"
                      />
                      <input
                        type="text"
                        value={editSatker}
                        onChange={(e) => setEditSatker(e.target.value)}
                        placeholder="Satker / Instansi"
                        className="w-full px-2.5 py-1.5 rounded bg-[#021b15] border border-emerald-700 text-white"
                      />
                      <textarea
                        rows={3}
                        value={editPesan}
                        onChange={(e) => setEditPesan(e.target.value)}
                        placeholder="Isi Ucapan"
                        className="w-full px-2.5 py-1.5 rounded bg-[#021b15] border border-emerald-700 text-white"
                      />
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={editBannerUrl}
                          onChange={(e) => setEditBannerUrl(e.target.value)}
                          placeholder="URL Gambar Banner Satker (Opsional)"
                          className="flex-1 px-2.5 py-1.5 rounded bg-[#021b15] border border-emerald-700 text-amber-200 min-w-0"
                        />
                        <label className="px-2 py-1.5 rounded bg-emerald-800 text-amber-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer shrink-0">
                          <Upload className="w-3 h-3" />
                          <span>Banner</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleBannerUpload(e, setEditBannerUrl)}
                            className="hidden"
                          />
                        </label>
                      </div>
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingMsgId(null)}
                          className="px-2.5 py-1 rounded bg-emerald-950 text-slate-300 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1 rounded bg-amber-400 text-slate-950 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Simpan</span>
                        </button>
                      </div>
                    </form>
                  ) : (
                    <p className="text-sm text-slate-100 leading-relaxed">“{msg.pesan}”</p>
                  )}
                </div>

                <div className="pt-3 border-t border-emerald-800/60">
                  <div className="text-xs font-bold text-white">{msg.nama}</div>
                  <div className="text-[11px] text-emerald-300">{msg.jabatanAtauSatker}</div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
