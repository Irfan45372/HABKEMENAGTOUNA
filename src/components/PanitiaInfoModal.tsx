import React, { useState } from 'react';
import { BrandingConfig, ScheduleEvent } from '../types/hab';
import { buildDeepLink, shareToWhatsAppWithFullImage } from '../utils/shareUtils';
import {
  Calendar,
  Check,
  Edit3,
  ExternalLink,
  Lock,
  Megaphone,
  Plus,
  Settings,
  Share2,
  Trash2,
  X,
} from 'lucide-react';

interface PanitiaInfoModalProps {
  isOpen: boolean;
  branding: BrandingConfig;
  schedules: ScheduleEvent[];
  adminPin?: string;
  isAdminUnlocked?: boolean;
  onUnlockAdmin?: () => void;
  onUpdateBranding?: (partial: Partial<BrandingConfig>) => void;
  onOpenAdminTab?: (tabIndex: number) => void;
  onClose: () => void;
  onJumpToSection: (sectionId: string) => void;
  onOpenJournal: () => void;
}

export const PanitiaInfoModal: React.FC<PanitiaInfoModalProps> = ({
  isOpen,
  branding,
  schedules,
  adminPin = '812027',
  isAdminUnlocked = false,
  onUnlockAdmin,
  onUpdateBranding,
  onOpenAdminTab,
  onClose,
  onJumpToSection,
  onOpenJournal,
}) => {
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [isManageOpen, setIsManageOpen] = useState(false);

  const [newAnnouncementText, setNewAnnouncementText] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [saveNotice, setSaveNotice] = useState('');

  if (!isOpen) return null;

  const infoPanitiaUrl = buildDeepLink({ info: 'panitia' });
  const announcements =
    branding.runningTextItems.length > 0
      ? branding.runningTextItems
      : [
          'Selamat Memperingati Hari Amal Bakti ke-81 Kementerian Agama Republik Indonesia — Kantor Kementerian Agama Kabupaten Tojo Una-Una Tahun 2027.',
        ];

  const triggerSavedNotice = (msg: string) => {
    setSaveNotice(msg);
    window.setTimeout(() => setSaveNotice(''), 3000);
  };

  const handleToggleManageMode = () => {
    if (isAdminUnlocked) {
      setIsManageOpen((prev) => !prev);
      setShowPinPrompt(false);
    } else {
      setShowPinPrompt((prev) => !prev);
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
    } else {
      setPinError('PIN Admin tidak sesuai.');
    }
  };

  const handleAddAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newAnnouncementText.trim();
    if (!cleaned || !onUpdateBranding) return;
    const updated = [...branding.runningTextItems, cleaned];
    onUpdateBranding({ runningTextItems: updated });
    setNewAnnouncementText('');
    triggerSavedNotice('Pengumuman baru berhasil ditambahkan & disimpan ke Cloud.');
  };

  const handleStartEdit = (idx: number, currentText: string) => {
    setEditingIndex(idx);
    setEditingText(currentText);
  };

  const handleSaveEdit = (idx: number) => {
    const cleaned = editingText.trim();
    if (!cleaned || !onUpdateBranding) return;
    const updated = [...announcements];
    updated[idx] = cleaned;
    onUpdateBranding({ runningTextItems: updated });
    setEditingIndex(null);
    setEditingText('');
    triggerSavedNotice(`Pengumuman #${idx + 1} berhasil diperbarui.`);
  };

  const handleDeleteAnnouncement = (idx: number) => {
    if (!onUpdateBranding) return;
    const updated = announcements.filter((_, i) => i !== idx);
    onUpdateBranding({ runningTextItems: updated });
    if (editingIndex === idx) {
      setEditingIndex(null);
      setEditingText('');
    }
    triggerSavedNotice(`Pengumuman #${idx + 1} berhasil dihapus.`);
  };

  const handleShareAllPanitiaInfoToWa = async () => {
    const bulletAnnouncements = announcements
      .map((item, idx) => `${idx + 1}. ${item}`)
      .join('\n\n');

    const upcomingSchedules = schedules
      .slice(0, 5)
      .map((s) => `• *${s.judul}* (${s.tanggal} | ${s.waktu}) — Status: ${s.status}`)
      .join('\n');

    const waText =
      `📢 *INFORMASI RESMI PANITIA HAB KE-81 KEMENAG KAB. TOJO UNA-UNA TAHUN 2027*\n` +
      `_by HUMAS KEMENTERIAN AGAMA KABUPATEN TOJO UNA UNA_\n\n` +
      `*Pengumuman Terkini Panitia:*\n${bulletAnnouncements}\n\n` +
      (upcomingSchedules ? `*Agenda & Jadwal Kegiatan:*\n${upcomingSchedules}\n\n` : '') +
      `🔗 *Buka Papan Informasi Panitia & Portal Resmi:*\n${infoPanitiaUrl}`;

    await shareToWhatsAppWithFullImage({
      title: 'Informasi Resmi Panitia HAB ke-81 Kemenag Tojo Una-Una',
      waText,
      imageSrc: branding.kemenagLogoPrimaryUrl || '/Kementerian-Agama.png',
      fileName: 'info-panitia-hab81-touna.jpg',
    });
  };

  const handleShareSingleAnnouncementToWa = async (text: string, idx: number) => {
    const itemUrl = buildDeepLink({ info: 'panitia', pengumuman: String(idx + 1) });
    const waText =
      `📢 *INFO PANITIA HAB KE-81 KEMENAG TOJO UNA-UNA*\n` +
      `_by HUMAS KEMENTERIAN AGAMA KABUPATEN TOJO UNA UNA_\n\n` +
      `"${text}"\n\n` +
      `🔗 *Lihat Informasi Lengkap di Portal Resmi:*\n${itemUrl}`;

    await shareToWhatsAppWithFullImage({
      title: `Pengumuman Panitia #${idx + 1} — HAB ke-81 Kemenag Touna`,
      waText,
      imageSrc: branding.kemenagLogoPrimaryUrl || '/Kementerian-Agama.png',
      fileName: `pengumuman-${idx + 1}-hab81.jpg`,
    });
  };

  const showAdminControls = isAdminUnlocked && isManageOpen;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="panitia-info-modal-title"
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
    >
      <div className="bg-[#03251c] border-2 border-amber-400/70 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-[#021b15] border-b border-emerald-800 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/50 flex items-center justify-center text-amber-300 shrink-0">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold tracking-wider uppercase text-amber-300">
                Papan Pengumuman Resmi · Humas Kemenag Tojo Una-Una
              </div>
              <h2 id="panitia-info-modal-title" className="text-base sm:text-lg font-bold text-white">
                Informasi Resmi Panitia HAB ke-81 Tahun 2027
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleToggleManageMode}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer border transition-colors ${
                showAdminControls
                  ? 'bg-amber-400 text-slate-950 border-amber-300'
                  : 'bg-emerald-950/90 hover:bg-emerald-900 text-amber-300 border-amber-400/40'
              }`}
              title="Edit, tambah, atau hapus daftar Pengumuman Panitia"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{showAdminControls ? 'Tutup Edit Admin' : 'Edit Pengumuman (Admin)'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-emerald-900/80 hover:bg-emerald-800 text-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
              <span>Tutup</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* PIN Unlock Prompt if Admin clicked Edit Pengumuman while locked */}
          {showPinPrompt && !isAdminUnlocked && (
            <form
              onSubmit={handleVerifyPin}
              className="p-4 rounded-xl bg-[#021b15] border-2 border-amber-400/60 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Masukkan PIN Admin untuk Mengedit Pengumuman Panitia</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPinPrompt(false)}
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
                  Buka Tabel Edit Pengumuman
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

          {/* Primary Share Bar for Info Panitia */}
          <div className="p-4 rounded-2xl bg-[#021b15] border border-amber-400/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-bold text-amber-300">
                Bagikan Pengumuman & Link Informasi Panitia ke Grup WhatsApp
              </div>
              <div className="text-[11px] text-slate-300 font-mono-tabular break-all">
                {infoPanitiaUrl}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleShareAllPanitiaInfoToWa}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Bagikan Info Panitia ke WA</span>
              </button>
            </div>
          </div>

          {/* Active Running Text Announcements List + Direct Admin Table Editor */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-amber-300" />
                <span>Daftar Pengumuman Terkini Panitia ({announcements.length} Pengumuman)</span>
              </h3>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleManageMode}
                  className="px-2.5 py-1 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-amber-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>{showAdminControls ? 'Selesai Edit' : 'Tambah / Edit Pengumuman'}</span>
                </button>

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
            </div>

            {/* Admin Add New Announcement Form */}
            {showAdminControls && onUpdateBranding && (
              <form
                onSubmit={handleAddAnnouncement}
                className="p-4 rounded-xl bg-[#021b15] border-2 border-amber-400/50 space-y-2.5"
              >
                <div className="text-xs font-bold text-amber-300 flex items-center justify-between">
                  <span>+ Tambah Pengumuman Panitia Baru</span>
                  <span className="text-[11px] font-normal text-emerald-300">
                    Otomatis tampil di Papan Info & Teks Berjalan Atas
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={newAnnouncementText}
                    onChange={(e) => setNewAnnouncementText(e.target.value)}
                    placeholder="Ketik isi pengumuman resmi panitia di sini..."
                    className="flex-1 px-3 py-2 rounded-lg bg-[#03251c] border border-emerald-700 text-white text-xs focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Pengumuman</span>
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-2.5">
              {announcements.map((item, index) => {
                const isEditingThis = showAdminControls && editingIndex === index;

                return (
                  <div
                    key={index}
                    className="p-4 rounded-xl bg-[#021b15]/90 border border-emerald-800/80 flex flex-col gap-3"
                  >
                    {isEditingThis ? (
                      <div className="space-y-2.5">
                        <div className="text-xs font-bold text-amber-300">
                          Edit Pengumuman #{index + 1}
                        </div>
                        <textarea
                          rows={2}
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-[#03251c] border border-amber-400 text-white text-xs sm:text-sm focus:outline-none"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingIndex(null);
                              setEditingText('');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(index)}
                            className="px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Simpan Perubahan</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className="w-6 h-6 rounded-lg bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                            {index + 1}
                          </span>
                          <p className="text-xs sm:text-sm text-white leading-relaxed">{item}</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-center">
                          {showAdminControls && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleStartEdit(index, item)}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40 text-amber-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Edit</span>
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
                            onClick={() => handleShareSingleAnnouncementToWa(item, index)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Share2 className="w-3 h-3" />
                            <span>Bagikan WA</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Schedule Summary */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-300" />
                <span>Ringkasan Jadwal & Agenda Kegiatan ({schedules.length} Agenda)</span>
              </h3>

              <div className="flex flex-wrap items-center gap-3">
                {onOpenAdminTab && (
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
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#021b15] border-t border-emerald-800 flex flex-wrap items-center justify-between gap-3 text-xs">
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
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
