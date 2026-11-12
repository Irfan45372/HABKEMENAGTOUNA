import React, { useMemo, useState } from 'react';
import { BaksosMetric, ScheduleEvent } from '../types/hab';
import {
  Calendar,
  Clock,
  HeartHandshake,
  Lock,
  MapPin,
  ShieldAlert,
  Trash2,
  Unlock,
  UserCheck,
} from 'lucide-react';

interface ScheduleBaksosSectionProps {
  schedules: ScheduleEvent[];
  baksosMetrics: BaksosMetric[];
  adminPin?: string;
  isAdminUnlocked?: boolean;
  onUnlockAdmin?: () => void;
  onDeleteSchedule?: (id: string) => void;
  onDeleteBaksos?: (id: string) => void;
  onClearAllBaksos?: () => void;
  onFocusVenueOnMap: (venueId: string) => void;
  onOpenAdminTab: (tabIndex: number) => void;
}

export const ScheduleBaksosSection: React.FC<ScheduleBaksosSectionProps> = ({
  schedules,
  baksosMetrics,
  adminPin = '812027',
  isAdminUnlocked = false,
  onUnlockAdmin,
  onDeleteSchedule,
  onDeleteBaksos,
  onClearAllBaksos,
  onFocusVenueOnMap,
  onOpenAdminTab,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [showQuickPinBox, setShowQuickPinBox] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState<boolean>(false);

  const categories = useMemo(() => {
    const set = new Set<string>([
      'Upacara & Kenegaraan',
      'Porseni & Lomba',
      'Bakti Sosial',
      'Jalan Sehat Kerukunan',
      'Rapat/Persiapan',
    ]);
    schedules.forEach((s) => {
      if (s.kategori) set.add(s.kategori);
    });
    return ['Semua', ...Array.from(set)];
  }, [schedules]);

  const filteredSchedules = useMemo(() => {
    const list =
      selectedCategory === 'Semua'
        ? schedules
        : schedules.filter((s) => s.kategori === selectedCategory);
    return [...list].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  }, [schedules, selectedCategory]);

  const handleQuickUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === (adminPin || '812027')) {
      onUnlockAdmin?.();
      setShowQuickPinBox(false);
      setPinInput('');
      setPinError(null);
    } else {
      setPinError('PIN Admin tidak sesuai.');
    }
  };

  return (
    <section
      id="jadwal-acara"
      aria-label="Jadwal Rangkaian Acara Dinamis dan Dashboard Dampak Bakti Sosial"
      className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-emerald-900/70 space-y-10"
    >
      {/* PART A: DYNAMIC MULTI-CATEGORY SCHEDULE TIMELINE */}
      <div>
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-semibold text-amber-300 tracking-wide mb-1">
              03. Agenda Resmi Panitia HAB ke-81 Tahun 2027
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white [text-wrap:balance]">
              Jadwal Rangkaian Acara & Kegiatan Kerukunan
            </h2>
            <p className="text-sm text-slate-300 mt-1.5 max-w-2xl">
              Rangkaian kegiatan dari persiapan, Porseni antar-Satker, Bakti Sosial, Jalan Sehat Kerukunan hingga Upacara Puncak 3 Januari 2027.
            </p>
          </div>

          {/* Interactive Category Filter + Admin Shortcut */}
          <div className="flex flex-wrap items-center gap-2">
            <div
              role="tablist"
              aria-label="Filter Kategori Jadwal Acara"
              className="flex flex-wrap items-center gap-1.5 bg-[#03221a] p-1.5 rounded-xl border border-emerald-800/80"
            >
              {categories.map((cat) => (
                <button
                  key={cat}
                  role="tab"
                  aria-selected={selectedCategory === cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-amber-400 text-slate-950 font-semibold shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => onOpenAdminTab(1)}
              className="px-3.5 py-2 rounded-xl bg-[#021b15] hover:bg-emerald-900 border border-emerald-700 text-xs text-amber-300 font-semibold cursor-pointer whitespace-nowrap"
            >
              Kelola Jadwal & Agenda (Admin)
            </button>
          </div>
        </div>

        {/* Timeline Cards Grid */}
        {filteredSchedules.length === 0 ? (
          <div className="bg-[#03251c] border border-emerald-800/70 rounded-2xl p-8 text-center text-sm text-slate-400">
            Belum ada agenda pada kategori ini. Admin dapat menambahkan atau memperbarui jadwal melalui Panel Kontrol.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-h-[420px] overflow-y-auto pr-1">
            {filteredSchedules.map((item) => {
              const statusColor =
                item.status === 'Sedang Berlangsung'
                  ? 'text-amber-300'
                  : item.status === 'Ditunda/Pindah Lokasi'
                  ? 'text-rose-400'
                  : item.status === 'Selesai'
                  ? 'text-emerald-400'
                  : 'text-sky-300';

              return (
                <article
                  key={item.id}
                  className="bg-[#03251c] border border-emerald-800/80 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-emerald-600/80 transition-colors"
                >
                  <div className="space-y-2.5">
                    {/* Unboxed Clean Metadata Header */}
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="text-amber-300 font-semibold">{item.kategori}</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${statusColor}`}>
                          Status: {item.status}
                        </span>
                        {isAdminUnlocked && onDeleteSchedule && (
                          <button
                            type="button"
                            onClick={() => onDeleteSchedule(item.id)}
                            title="Hapus Agenda Ini (Admin)"
                            className="p-1 rounded bg-rose-950/90 hover:bg-rose-900 text-rose-300 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-white leading-snug">
                      {item.judul}
                    </h3>

                    <div className="space-y-1.5 text-xs text-slate-300 pt-1">
                      <div className="flex items-center gap-2 font-mono-tabular text-emerald-200">
                        <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{item.tanggal}</span>
                        <span aria-hidden="true">·</span>
                        <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{item.waktu}</span>
                      </div>

                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <button
                          type="button"
                          onClick={() => onFocusVenueOnMap(item.lokasiId)}
                          className="text-left text-slate-200 hover:text-amber-300 underline decoration-emerald-600 underline-offset-4 cursor-pointer"
                        >
                          {item.lokasiNama} (Lihat di Peta GPS)
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Koordinator/PIC: {item.pic}</span>
                      </div>
                    </div>
                  </div>

                  {item.catatan && (
                    <div className="pt-3 border-t border-emerald-800/60 text-xs text-slate-300 leading-relaxed flex items-start gap-2">
                      {item.status === 'Ditunda/Pindah Lokasi' && (
                        <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <span>{item.catatan}</span>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* PART B: DASHBOARD DAMPAK BAKTI SOSIAL KEMENAG TOJO UNA-UNA */}
      <div className="bg-[#03251c] border border-emerald-800/80 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-emerald-800/70 pb-5">
          <div>
            <p className="text-xs font-semibold text-amber-300 tracking-wide mb-1 flex items-center gap-1.5">
              <HeartHandshake className="w-4 h-4 text-amber-400" />
              Kepedulian Umat & Pengabdian Masyarakat
            </p>
            <h3 className="font-display text-xl sm:text-2xl font-bold text-white">
              Dashboard Dampak Bakti Sosial HAB ke-81 Kemenag Tojo Una-Una
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Capaian terukur aksi sosial Kemenag Peduli di 12 Kecamatan Daratan & Kepulauan Kabupaten Tojo Una-Una.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start">
            {isAdminUnlocked && baksosMetrics.length > 0 && onClearAllBaksos && (
              confirmClearAll ? (
                <div className="flex items-center gap-1.5 bg-rose-950/90 border border-rose-500/60 rounded-lg px-2.5 py-1.5 text-xs">
                  <span className="text-rose-200 font-semibold">Kosongkan semua?</span>
                  <button
                    type="button"
                    onClick={() => {
                      onClearAllBaksos();
                      setConfirmClearAll(false);
                    }}
                    className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
                  >
                    Ya, Hapus Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearAll(false)}
                    className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(true)}
                  className="px-3 py-2 rounded-lg bg-rose-950/90 hover:bg-rose-900 border border-rose-500/50 text-xs text-rose-200 font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Semua Baksos</span>
                </button>
              )
            )}

            {!isAdminUnlocked && baksosMetrics.length > 0 && (
              <button
                type="button"
                onClick={() => setShowQuickPinBox((prev) => !prev)}
                className="px-3 py-2 rounded-lg bg-[#021b15] hover:bg-emerald-900 border border-emerald-700/80 text-xs text-slate-300 hover:text-amber-300 font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Hapus Cepat (Admin)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onOpenAdminTab(1)}
              className="px-3.5 py-2 rounded-lg bg-[#021b15] hover:bg-emerald-900 border border-emerald-700 text-xs text-amber-300 font-semibold cursor-pointer whitespace-nowrap"
            >
              Kelola Indikator Bakti Sosial (Admin)
            </button>
          </div>
        </div>

        {/* Inline Quick PIN Unlock Box for Instant Baksos Deletion */}
        {showQuickPinBox && !isAdminUnlocked && (
          <form
            onSubmit={handleQuickUnlock}
            className="bg-[#021b15] border border-amber-400/50 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3"
          >
            <div className="text-xs text-slate-200">
              Masukkan <strong>PIN Admin Panitia</strong> untuk mengaktifkan tombol hapus langsung pada kartu Baksos & Jadwal:
              {pinError && <span className="ml-2 text-rose-400 font-semibold">{pinError}</span>}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="PIN Admin"
                className="px-3 py-1.5 rounded-lg bg-[#03251c] border border-emerald-700 text-xs text-white w-32 font-mono-tabular"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Buka Akses Hapus</span>
              </button>
            </div>
          </form>
        )}

        {baksosMetrics.length === 0 ? (
          <div className="bg-[#021b15] border border-emerald-800/70 rounded-xl p-6 text-center text-xs text-slate-400">
            Belum ada indikator Bakti Sosial yang ditampilkan. Admin dapat menambahkan program Bakti Sosial kapan saja melalui tombol &ldquo;Kelola Indikator Bakti Sosial (Admin)&rdquo;.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[380px] overflow-y-auto pr-1">
            {baksosMetrics.map((metric) => {
              const pct = Math.min(
                100,
                Math.round((metric.capaian / Math.max(1, metric.target)) * 100)
              );
              return (
                <div
                  key={metric.id}
                  className="bg-[#021b15] border border-emerald-800/70 rounded-xl p-4 flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-xs font-semibold text-amber-300">
                        {metric.namaProgram}
                      </div>
                      {isAdminUnlocked && onDeleteBaksos && (
                        <button
                          type="button"
                          onClick={() => onDeleteBaksos(metric.id)}
                          title={`Hapus "${metric.namaProgram}" secara permanen`}
                          className="p-1 rounded bg-rose-950/90 hover:bg-rose-900 border border-rose-500/40 text-rose-300 shrink-0 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="mt-2 flex items-baseline justify-between gap-2">
                      <div className="font-mono-tabular text-2xl font-extrabold text-white">
                        {metric.capaian.toLocaleString('id-ID')}{' '}
                        <span className="text-xs font-normal text-emerald-300">
                          / {metric.target.toLocaleString('id-ID')} {metric.satuan}
                        </span>
                      </div>
                      <span className="font-mono-tabular text-xs font-bold text-amber-300">
                        {pct}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-emerald-950 rounded-full overflow-hidden mt-2 border border-emerald-800/60">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 pt-2 border-t border-emerald-900/60 flex items-center justify-between gap-2">
                    <span className="truncate">{metric.lokasi}</span>
                    <span className="text-slate-300 shrink-0">{metric.koordinator}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
