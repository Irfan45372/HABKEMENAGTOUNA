import React, { useState } from 'react';
import { BrandingConfig, ScheduleEvent } from '../types/hab';
import { buildDeepLink, shareToWhatsAppWithFullImage } from '../utils/shareUtils';
import {
  Calendar,
  Check,
  Copy,
  ExternalLink,
  Megaphone,
  Share2,
  X,
} from 'lucide-react';

interface PanitiaInfoModalProps {
  isOpen: boolean;
  branding: BrandingConfig;
  schedules: ScheduleEvent[];
  onClose: () => void;
  onJumpToSection: (sectionId: string) => void;
  onOpenJournal: () => void;
}

export const PanitiaInfoModal: React.FC<PanitiaInfoModalProps> = ({
  isOpen,
  branding,
  schedules,
  onClose,
  onJumpToSection,
  onOpenJournal,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const infoPanitiaUrl = buildDeepLink({ info: 'panitia' });
  const announcements =
    branding.runningTextItems.length > 0
      ? branding.runningTextItems
      : [
          'Selamat Memperingati Hari Amal Bakti ke-81 Kementerian Agama Republik Indonesia — Kantor Kementerian Agama Kabupaten Tojo Una-Una Tahun 2027.',
        ];

  const handleCopy = async (key: string, textToCopy: string) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 3000);
    } catch {
      setCopiedKey(key);
    }
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

  const quickPortalLinks = [
    {
      id: 'link-info',
      label: 'Link Papan Informasi Panitia',
      url: buildDeepLink({ info: 'panitia' }),
    },
    {
      id: 'link-jurnal',
      label: 'Link Menu Khusus Jurnal & Berita',
      url: buildDeepLink({ menu: 'jurnal' }),
    },
    {
      id: 'link-lomba',
      label: 'Link Pendaftaran Lomba & Juknis',
      url: buildDeepLink({ menu: 'lomba' }),
    },
    {
      id: 'link-banner',
      label: 'Link Galeri Spanduk & Banner Satker',
      url: buildDeepLink({ menu: 'banner' }),
    },
    {
      id: 'link-kupon',
      label: 'Link Kupon Jalan Sehat & Twibbon',
      url: buildDeepLink({ menu: 'kupon' }),
    },
  ];

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

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-emerald-900/80 hover:bg-emerald-800 text-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
            <span>Tutup</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
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
              <button
                type="button"
                onClick={() => handleCopy('main-info-url', infoPanitiaUrl)}
                className="px-3.5 py-2 rounded-xl bg-[#03251c] hover:bg-emerald-900 border border-emerald-700 text-amber-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                {copiedKey === 'main-info-url' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Link Info Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Link Info Panitia</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Active Running Text Announcements List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-amber-300" />
              <span>Daftar Pengumuman Terkini Panitia ({announcements.length} Pengumuman)</span>
            </h3>

            <div className="space-y-2.5">
              {announcements.map((item, index) => {
                const itemLink = buildDeepLink({
                  info: 'panitia',
                  pengumuman: String(index + 1),
                });
                const copyId = `ann-${index}`;
                return (
                  <div
                    key={index}
                    className="p-4 rounded-xl bg-[#021b15]/90 border border-emerald-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-lg bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      <p className="text-xs sm:text-sm text-white leading-relaxed">{item}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleShareSingleAnnouncementToWa(item, index)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Share2 className="w-3 h-3" />
                        <span>WA</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(copyId, itemLink)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#03251c] hover:bg-emerald-900 border border-emerald-700 text-amber-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === copyId ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Salin Link</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Schedule Summary */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-300" />
                <span>Ringkasan Jadwal & Agenda Kegiatan ({schedules.length} Agenda)</span>
              </h3>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {schedules.map((sch) => {
                const schLink = buildDeepLink({ jadwal: sch.id });
                const copyId = `sch-${sch.id}`;
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
                      <button
                        type="button"
                        onClick={() => handleCopy(copyId, schLink)}
                        className="px-2.5 py-1 rounded bg-[#03251c] hover:bg-emerald-900 border border-emerald-700 text-amber-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === copyId ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Salin Link</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Directory of All Important Direct Links */}
          <div className="space-y-2.5 pt-2 border-t border-emerald-800/80">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Daftar Link Cepat Portal Resmi (Siap Salin ke Grup WhatsApp)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {quickPortalLinks.map((item) => (
                <div
                  key={item.id}
                  className="px-3.5 py-2.5 rounded-xl bg-[#021b15] border border-emerald-800/80 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">{item.label}</div>
                    <div className="text-[10px] text-slate-400 font-mono-tabular truncate">
                      {item.url}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(item.id, item.url)}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-900/80 hover:bg-emerald-800 text-amber-300 text-[11px] font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    {copiedKey === item.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Salin</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
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
