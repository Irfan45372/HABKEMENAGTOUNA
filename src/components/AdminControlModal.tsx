import React, { useEffect, useState } from 'react';
import {
  AppState,
  BaksosMetric,
  Competition,
  MatchScore,
  MedalStanding,
  NavLabelsConfig,
  ParticipantFormat,
  RegistrationStatus,
  ScheduleEvent,
  ScheduleStatus,
  VenueArchetype,
  VenueLocation,
} from '../types/hab';
import { validateImportedState } from '../utils/habLogic';
import {
  Check,
  Download,
  Edit3,
  Lock,
  Plus,
  RotateCcw,
  Settings,
  ShieldCheck,
  Trash2,
  Unlock,
  Upload,
  X,
} from 'lucide-react';

interface AdminControlModalProps {
  isOpen: boolean;
  initialTab?: number;
  appState: AppState;
  onClose: () => void;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
  onResetDefault: () => void;
  onActivateInlineEdit?: () => void;
}

export const AdminControlModal: React.FC<AdminControlModalProps> = ({
  isOpen,
  initialTab = 0,
  appState,
  onClose,
  onUpdateState,
  onResetDefault,
  onActivateInlineEdit,
}) => {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<number>(initialTab);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  // Tab 1: New Competition State
  const [newCompNama, setNewCompNama] = useState('');
  const [newCompKategori, setNewCompKategori] = useState('Olahraga');
  const [newCompFormat, setNewCompFormat] = useState<ParticipantFormat>('Beregu/Tim');
  const [newCompKuota, setNewCompKuota] = useState<number>(6);
  const [newCompJadwal, setNewCompJadwal] = useState('Desember 2026');
  const [newCompLokasiId, setNewCompLokasiId] = useState(
    appState.venues[0]?.id || 'venue-kantor-kemenag'
  );
  const [newCompPic, setNewCompPic] = useState('Panitia Porseni HAB-81');
  const [newCompJuknis, setNewCompJuknis] = useState('#juknis');

  // Tab 1: New Match Score State
  const [newMatchCompName, setNewMatchCompName] = useState(
    appState.competitions[0]?.nama || 'Bola Voli'
  );
  const [newMatchBabak, setNewMatchBabak] = useState('Penyisihan');
  const [newMatchA, setNewMatchA] = useState('');
  const [newMatchB, setNewMatchB] = useState('');
  const [newMatchSkorA, setNewMatchSkorA] = useState('0');
  const [newMatchSkorB, setNewMatchSkorB] = useState('0');

  // Tab 2: New Schedule Event State
  const [newSchJudul, setNewSchJudul] = useState('');
  const [newSchKat, setNewSchKat] = useState('Porseni & Lomba');
  const [newSchTanggal, setNewSchTanggal] = useState('2026-12-20');
  const [newSchWaktu, setNewSchWaktu] = useState('08:00 - 12:00 WITA');
  const [newSchLokasiId, setNewSchLokasiId] = useState(
    appState.venues[0]?.id || 'venue-kantor-kemenag'
  );
  const [newSchPic, setNewSchPic] = useState('Seksi Acara');
  const [newSchStatus, setNewSchStatus] = useState<ScheduleStatus>('Terjadwal');
  const [newSchCatatan, setNewSchCatatan] = useState('');

  // Tab 2: New Venue State
  const [newVenueNama, setNewVenueNama] = useState('');
  const [newVenueAlamat, setNewVenueAlamat] = useState('Ampana, Kab. Tojo Una-Una');
  const [newVenueGps, setNewVenueGps] = useState('-0.9125845029778236, 121.58667527394272');
  const [newVenueX, setNewVenueX] = useState<number>(0);
  const [newVenueZ, setNewVenueZ] = useState<number>(0);
  const [newVenueArch, setNewVenueArch] = useState<VenueArchetype>('aula_kerukunan');
  const [newVenueMaps, setNewVenueMaps] = useState(
    'https://www.google.com/maps?q=-0.9125845029778236,121.58667527394272'
  );

  // Tab 2: New Baksos Metric State
  const [newBaksosNama, setNewBaksosNama] = useState('');
  const [newBaksosTarget, setNewBaksosTarget] = useState<number>(100);
  const [newBaksosCapaian, setNewBaksosCapaian] = useState<number>(50);
  const [newBaksosSatuan, setNewBaksosSatuan] = useState('Paket');

  // Tab 3: New Satker State
  const [newSatkerInput, setNewSatkerInput] = useState('');

  // Tab 5: New Running Text State
  const [newTickerInput, setNewTickerInput] = useState('');

  if (!isOpen) return null;

  const notify = (msg: string) => {
    setStatusBanner(msg);
    window.setTimeout(() => setStatusBanner(null), 3500);
  };

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    const expectedPin = appState.branding.adminPin || '812027';
    if (pinInput.trim() === expectedPin) {
      setIsUnlocked(true);
      setPinError(null);
    } else {
      setPinError('Kode PIN Admin tidak sesuai (Default PIN Panitia: 812027).');
    }
  };

  // CRUD Handlers
  const handleAddCompetition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompNama.trim()) return;
    const item: Competition = {
      id: `comp-${Date.now()}`,
      nama: newCompNama.trim(),
      kategori: newCompKategori.trim() || 'Olahraga',
      jenisPeserta: newCompFormat,
      kuotaPemain: Math.max(1, Number(newCompKuota) || 1),
      statusPendaftaran: 'Buka',
      juknisUrl: newCompJuknis.trim() || '#juknis',
      jadwalRingkas: newCompJadwal.trim() || 'Desember 2026',
      lokasiId: newCompLokasiId,
      koordinator: newCompPic.trim() || 'Panitia HAB-81',
    };
    onUpdateState((prev) => ({
      ...prev,
      competitions: [item, ...prev.competitions],
    }));
    setNewCompNama('');
    notify(`Cabang lomba "${item.nama}" berhasil ditambahkan.`);
  };

  const handleToggleCompStatus = (id: string) => {
    onUpdateState((prev) => ({
      ...prev,
      competitions: prev.competitions.map((c) =>
        c.id === id
          ? {
              ...c,
              statusPendaftaran: (c.statusPendaftaran === 'Buka'
                ? 'Tutup'
                : 'Buka') as RegistrationStatus,
            }
          : c
      ),
    }));
  };

  const handleDeleteCompetition = (id: string) => {
    onUpdateState((prev) => ({
      ...prev,
      competitions: prev.competitions.filter((c) => c.id !== id),
    }));
    notify('Cabang lomba dihapus.');
  };

  const handleAddMatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatchA.trim() || !newMatchB.trim()) return;
    const match: MatchScore = {
      id: `match-${Date.now()}`,
      competitionId: 'comp-custom',
      competitionName: newMatchCompName,
      babak: newMatchBabak,
      kontingenA: newMatchA.trim(),
      kontingenB: newMatchB.trim(),
      skorA: newMatchSkorA,
      skorB: newMatchSkorB,
      waktu: 'Des 2026 • WITA',
      lokasi: 'Arena Porseni Touna',
      status: 'Sedang Berlangsung',
    };
    onUpdateState((prev) => ({
      ...prev,
      matches: [match, ...prev.matches],
    }));
    setNewMatchA('');
    setNewMatchB('');
    notify('Data skor pertandingan ditambahkan.');
  };

  const handleUpdateMedal = (
    id: string,
    field: 'emas' | 'perak' | 'perunggu',
    delta: number
  ) => {
    onUpdateState((prev) => ({
      ...prev,
      medalStandings: prev.medalStandings.map((m) =>
        m.id === id ? { ...m, [field]: Math.max(0, m[field] + delta) } : m
      ),
    }));
  };

  const handleAddSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchJudul.trim()) return;
    const venueObj = appState.venues.find((v) => v.id === newSchLokasiId);
    const ev: ScheduleEvent = {
      id: `sch-${Date.now()}`,
      judul: newSchJudul.trim(),
      kategori: newSchKat.trim() || 'Porseni & Lomba',
      tanggal: newSchTanggal,
      waktu: newSchWaktu,
      lokasiId: newSchLokasiId,
      lokasiNama: venueObj?.nama || 'Kantor Kemenag Kab. Tojo Una-Una',
      pic: newSchPic.trim() || 'Panitia HAB-81',
      status: newSchStatus,
      catatan: newSchCatatan.trim(),
    };
    onUpdateState((prev) => ({
      ...prev,
      schedules: [...prev.schedules, ev],
    }));
    setNewSchJudul('');
    setNewSchCatatan('');
    notify(`Agenda "${ev.judul}" berhasil ditambahkan.`);
  };

  const handleAddVenue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVenueNama.trim()) return;
    const parts = newVenueGps.split(',').map((p) => Number(p.trim()));
    const parsedLat = parts.length === 2 && !Number.isNaN(parts[0]) ? parts[0] : -0.9125845029778236;
    const parsedLng = parts.length === 2 && !Number.isNaN(parts[1]) ? parts[1] : 121.58667527394272;
    const cleanGps = `${parsedLat}, ${parsedLng}`;
    const v: VenueLocation = {
      id: `venue-${Date.now()}`,
      nama: newVenueNama.trim(),
      alamat: newVenueAlamat.trim(),
      koordinatX: Number(newVenueX) || 0,
      koordinatZ: Number(newVenueZ) || 0,
      latitude: parsedLat,
      longitude: parsedLng,
      koordinatGps: cleanGps,
      archetype: newVenueArch,
      googleMapsUrl:
        newVenueMaps.trim() || `https://www.google.com/maps?q=${parsedLat},${parsedLng}`,
      deskripsi: 'Titik pelaksanaan kegiatan resmi HAB ke-81 Kemenag Tojo Una-Una.',
      kapasitas: '500 Peserta',
    };
    onUpdateState((prev) => ({
      ...prev,
      venues: [...prev.venues, v],
    }));
    setNewVenueNama('');
    notify(`Pin Lokasi 3D "${v.nama}" (GPS: ${cleanGps}) berhasil ditambahkan ke Peta Interaktif.`);
  };

  const handleAddBaksos = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBaksosNama.trim()) return;
    const b: BaksosMetric = {
      id: `baksos-${Date.now()}`,
      namaProgram: newBaksosNama.trim(),
      target: Math.max(1, Number(newBaksosTarget) || 100),
      capaian: Math.max(0, Number(newBaksosCapaian) || 0),
      satuan: newBaksosSatuan.trim() || 'Paket',
      lokasi: 'Kabupaten Tojo Una-Una',
      koordinator: 'Seksi Bakti Sosial HAB-81',
    };
    onUpdateState((prev) => ({
      ...prev,
      baksosMetrics: [...prev.baksosMetrics, b],
    }));
    setNewBaksosNama('');
    notify(`Indikator Bakti Sosial "${b.namaProgram}" berhasil ditambahkan.`);
  };

  const handleAddSatker = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newSatkerInput.trim();
    if (!clean) return;
    if (appState.satkerList.includes(clean)) {
      notify('Nama Satker sudah ada dalam daftar.');
      return;
    }
    onUpdateState((prev) => ({
      ...prev,
      satkerList: [clean, ...prev.satkerList],
    }));
    setNewSatkerInput('');
    notify(`Satker "${clean}" ditambahkan ke daftar kontingen.`);
  };

  const handleHabLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUpdateState((prev) => ({
          ...prev,
          branding: {
            ...prev.branding,
            habLogoCustomUrl: reader.result as string,
            habLogoStatusBadge: 'Logo Resmi HAB ke-81 Kementerian Agama RI',
          },
        }));
        notify('Logo HAB ke-81 berhasil diperbarui di seluruh halaman, Medali 3D & Kupon QR!');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleExportJson = () => {
    const jsonStr = JSON.stringify(appState, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hab81-kemenag-touna-2027-state.json';
    a.click();
    URL.revokeObjectURL(url);
    notify('File hab81-kemenag-touna-2027-state.json berhasil diunduh untuk diunggah ke root repo GitHub.');
  };

  const handleCopyJsonClipboard = async () => {
    try {
      const jsonStr = JSON.stringify(appState, null, 2);
      await navigator.clipboard.writeText(jsonStr);
      notify('Seluruh JSON Database berhasil disalin ke Clipboard! Siap ditempel ke GitHub.');
    } catch {
      notify('Gagal menyalin ke clipboard, silakan gunakan tombol Ekspor File JSON.');
    }
  };

  const handlePullFromGitHub = async () => {
    try {
      notify('Menghubungi repositori GitHub Irfan45372/HABKEMENAGTOUNA...');
      const res = await fetch(
        `https://raw.githubusercontent.com/Irfan45372/HABKEMENAGTOUNA/main/hab81-kemenag-touna-2027-state.json?t=${Date.now()}`,
        { cache: 'no-store' }
      );
      if (!res.ok) {
        notify(
          'File hab81-kemenag-touna-2027-state.json belum ditemukan di branch main GitHub. Ekspor dan unggah file tersebut terlebih dahulu.'
        );
        return;
      }
      const parsed = await res.json();
      const check = validateImportedState(parsed);
      if (!check.valid || !check.state) {
        notify(check.error || 'Format JSON di GitHub tidak valid.');
        return;
      }
      onUpdateState(() => check.state!);
      notify('Berhasil menarik & menyinkronkan data terbaru langsung dari GitHub!');
    } catch {
      notify('Gagal menarik data dari GitHub. Pastikan koneksi internet aktif dan repo bersifat Public.');
    }
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const check = validateImportedState(parsed);
        if (!check.valid || !check.state) {
          notify(check.error || 'Format JSON tidak sesuai.');
          return;
        }
        onUpdateState(() => check.state!);
        notify('Konfigurasi JSON berhasil diimpor dan diterapkan!');
      } catch {
        notify('Gagal membaca file JSON.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-modal-title"
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
    >
      <div className="bg-[#03251c] border-2 border-amber-400/70 rounded-2xl max-w-6xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Modal Header */}
        <div className="px-6 py-4 bg-[#021b15] border-b border-emerald-800 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-amber-400" />
            <div>
              <h2 id="admin-modal-title" className="text-base sm:text-lg font-bold text-white">
                Quick Admin Control Panel — CRUD Engine HAB ke-81 Kemenag Tojo Una-Una
              </h2>
              <p className="text-xs text-emerald-300">
                Seluruh perubahan tersimpan otomatis di browser (localStorage) & dapat diekspor ke JSON GitHub
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isUnlocked && onActivateInlineEdit && (
              <button
                type="button"
                onClick={onActivateInlineEdit}
                className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Teks Langsung di Halaman</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup Panel Admin"
              className="px-3 py-1.5 rounded-lg bg-emerald-900/80 hover:bg-emerald-800 text-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Tutup</span>
            </button>
          </div>
        </div>

        {/* Status Notification Banner */}
        {statusBanner && (
          <div className="px-6 py-2.5 bg-amber-400 text-slate-950 text-xs font-bold flex items-center justify-between shrink-0">
            <span>{statusBanner}</span>
          </div>
        )}

        {/* PIN Gate or Full CRUD Tabs */}
        {!isUnlocked ? (
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-emerald-900/80 border border-amber-400/50 flex items-center justify-center text-amber-300">
              <Lock className="w-7 h-7" />
            </div>
            <div className="max-w-md space-y-1.5">
              <h3 className="text-xl font-bold text-white">
                Otorisasi Panitia HAB ke-81 Kemenag Touna
              </h3>
              
            </div>

            {pinError && (
              <div role="alert" className="text-xs text-rose-300 bg-rose-950/90 border border-rose-500/50 px-4 py-2 rounded-lg">
                {pinError}
              </div>
            )}

            <form onSubmit={handleUnlock} className="flex flex-wrap items-center justify-center gap-2">
              <input
                type="password"
                aria-label="PIN Admin Panitia"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Masukkan PIN Rahasia"
                className="px-4 py-2.5 rounded-lg bg-[#021b15] border border-emerald-700 text-sm text-white font-mono-tabular text-center focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Unlock className="w-4 h-4" />
                <span>Buka Panel</span>
              </button>
              
            </form>
          </div>
        ) : (
          <>
            {/* 5 Admin CRUD Tabs Navigation */}
            <div
              role="tablist"
              aria-label="Tab Modul Admin"
              className="px-6 py-2.5 bg-[#02221a] border-b border-emerald-800 flex flex-wrap items-center gap-2 shrink-0"
            >
              {[
                '1. Cabang Lomba & Skor (CRUD)',
                '2. Jadwal, Peta 3D & Baksos (CRUD)',
                '3. Master Satker & Pendaftar (CRUD)',
                '4. Kupon QR & Moderasi Ucapan',
                '5. Branding Logo HAB-81 & JSON GitHub',
              ].map((label, idx) => (
                <button
                  key={label}
                  role="tab"
                  aria-selected={activeTab === idx}
                  type="button"
                  onClick={() => setActiveTab(idx)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    activeTab === idx
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-[#021b15] text-slate-300 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Scrollable Tab Body */}
            <div className="p-6 overflow-y-auto space-y-8 flex-1">
              {/* ===================================================================
                  TAB 1: MASTER CABANG LOMBA, SKOR & KLASEMEN MEDALI
                 =================================================================== */}
              {activeTab === 0 && (
                <div className="space-y-8">
                  {/* Add New Competition Form */}
                  <form
                    onSubmit={handleAddCompetition}
                    className="bg-[#021b15] border border-emerald-800 rounded-xl p-5 space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-amber-300">
                        + Tambah Cabang Lomba / Olahraga / Seni Baru
                      </h3>
                      <label className="flex items-center gap-2 text-xs text-emerald-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={appState.branding.allowCustomCompetitionProposal}
                          onChange={(e) =>
                            onUpdateState((prev) => ({
                              ...prev,
                              branding: {
                                ...prev.branding,
                                allowCustomCompetitionProposal: e.target.checked,
                              },
                            }))
                          }
                          className="accent-amber-400"
                        />
                        <span>Izinkan Kontingen Mengusulkan Cabang Lomba Baru di Form Publik</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <input
                        type="text"
                        aria-label="Nama Cabang Lomba Baru"
                        value={newCompNama}
                        onChange={(e) => setNewCompNama(e.target.value)}
                        placeholder="Nama Cabang Lomba Baru *"
                        className="px-3 py-2 rounded-lg bg-[#03251c] border border-emerald-700 text-xs text-white"
                      />
                      <input
                        type="text"
                        aria-label="Kategori Lomba"
                        value={newCompKategori}
                        onChange={(e) => setNewCompKategori(e.target.value)}
                        placeholder="Kategori (Olahraga / Seni & Budaya)"
                        className="px-3 py-2 rounded-lg bg-[#03251c] border border-emerald-700 text-xs text-white"
                      />
                      <select
                        aria-label="Format Peserta"
                        value={newCompFormat}
                        onChange={(e) => setNewCompFormat(e.target.value as ParticipantFormat)}
                        className="px-3 py-2 rounded-lg bg-[#03251c] border border-emerald-700 text-xs text-white"
                      >
                        <option value="Perorangan/Individu">Perorangan/Individu</option>
                        <option value="Ganda">Ganda</option>
                        <option value="Beregu/Tim">Beregu/Tim</option>
                      </select>
                      <input
                        type="number"
                        aria-label="Kuota Maksimal Pemain"
                        min={1}
                        max={30}
                        value={newCompKuota}
                        onChange={(e) => setNewCompKuota(Number(e.target.value))}
                        placeholder="Kuota Pemain"
                        className="px-3 py-2 rounded-lg bg-[#03251c] border border-emerald-700 text-xs text-white"
                      />
                      <input
                        type="text"
                        value={newCompJadwal}
                        onChange={(e) => setNewCompJadwal(e.target.value)}
                        placeholder="Jadwal Ringkas (mis. 20 Des 2026)"
                        className="px-3 py-2 rounded-lg bg-[#03251c] border border-emerald-700 text-xs text-white"
                      />
                      <select
                        value={newCompLokasiId}
                        onChange={(e) => setNewCompLokasiId(e.target.value)}
                        className="px-3 py-2 rounded-lg bg-[#03251c] border border-emerald-700 text-xs text-white"
                      >
                        {appState.venues.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.nama}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={newCompPic}
                        onChange={(e) => setNewCompPic(e.target.value)}
                        placeholder="Koordinator / Seksi"
                        className="px-3 py-2 rounded-lg bg-[#03251c] border border-emerald-700 text-xs text-white"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Tambah Cabang Lomba</span>
                      </button>
                    </div>
                  </form>

                  {/* Existing Competitions List */}
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold text-slate-200">
                      Daftar Master Cabang Lomba Aktif ({appState.competitions.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {appState.competitions.map((comp) => (
                        <div
                          key={comp.id}
                          className="bg-[#021b15] border border-emerald-800/80 rounded-xl p-3.5 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">
                              {comp.nama}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {comp.kategori} · {comp.jenisPeserta} (Kuota {comp.kuotaPemain}) ·{' '}
                              {comp.jadwalRingkas}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleCompStatus(comp.id)}
                              className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${
                                comp.statusPendaftaran === 'Buka'
                                  ? 'bg-emerald-800 text-emerald-200'
                                  : 'bg-rose-900 text-rose-200'
                              }`}
                            >
                              {comp.statusPendaftaran}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCompetition(comp.id)}
                              aria-label={`Hapus ${comp.nama}`}
                              className="p-1.5 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick Match Scoreboard & Medal Editor */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-emerald-800">
                    {/* Add Match Score */}
                    <form
                      onSubmit={handleAddMatch}
                      className="bg-[#021b15] border border-emerald-800 rounded-xl p-4 space-y-3"
                    >
                      <h4 className="text-xs font-bold text-amber-300">
                        + Tambah Skor Pertandingan Live
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={newMatchCompName}
                          onChange={(e) => setNewMatchCompName(e.target.value)}
                          placeholder="Cabang Lomba"
                          className="px-3 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-xs text-white"
                        />
                        <input
                          type="text"
                          value={newMatchBabak}
                          onChange={(e) => setNewMatchBabak(e.target.value)}
                          placeholder="Babak (Semifinal/Final)"
                          className="px-3 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-xs text-white"
                        />
                        <input
                          type="text"
                          value={newMatchA}
                          onChange={(e) => setNewMatchA(e.target.value)}
                          placeholder="Kontingen A *"
                          className="px-3 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-xs text-white"
                        />
                        <input
                          type="text"
                          value={newMatchB}
                          onChange={(e) => setNewMatchB(e.target.value)}
                          placeholder="Kontingen B *"
                          className="px-3 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-xs text-white"
                        />
                        <input
                          type="text"
                          value={newMatchSkorA}
                          onChange={(e) => setNewMatchSkorA(e.target.value)}
                          placeholder="Skor A"
                          className="px-3 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-xs text-white"
                        />
                        <input
                          type="text"
                          value={newMatchSkorB}
                          onChange={(e) => setNewMatchSkorB(e.target.value)}
                          placeholder="Skor B"
                          className="px-3 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-xs text-white"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs cursor-pointer"
                      >
                        Simpan Skor Pertandingan
                      </button>
                    </form>

                    {/* Medal Standings Quick Adjust */}
                    <div className="bg-[#021b15] border border-emerald-800 rounded-xl p-4 space-y-2.5">
                      <h4 className="text-xs font-bold text-amber-300">
                        Update Cepat Klasemen Medali Kontingen
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {appState.medalStandings.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between gap-2 text-xs bg-[#03251c] px-3 py-1.5 rounded-lg"
                          >
                            <span className="text-white truncate font-medium">{m.satker}</span>
                            <div className="flex items-center gap-2 shrink-0 font-mono-tabular">
                              <button
                                type="button"
                                onClick={() => handleUpdateMedal(m.id, 'emas', 1)}
                                className="px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 hover:bg-amber-400/30 cursor-pointer"
                              >
                                +Emas ({m.emas})
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateMedal(m.id, 'perak', 1)}
                                className="px-2 py-0.5 rounded bg-slate-700 text-slate-200 cursor-pointer"
                              >
                                +Perak ({m.perak})
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateMedal(m.id, 'perunggu', 1)}
                                className="px-2 py-0.5 rounded bg-amber-900/50 text-amber-400 cursor-pointer"
                              >
                                +Prg ({m.perunggu})
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ===================================================================
                  TAB 2: JADWAL ACARA, PIN LOKASI PETA 3D & DAMPAK BAKTI SOSIAL
                 =================================================================== */}
              {activeTab === 1 && (
                <div className="space-y-8">
                  {/* Add Schedule Form */}
                  <form
                    onSubmit={handleAddSchedule}
                    className="bg-[#021b15] border border-emerald-800 rounded-xl p-5 space-y-3"
                  >
                    <h3 className="text-sm font-bold text-amber-300">
                      + Tambah Agenda Rangkaian Acara Baru
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <input
                        type="text"
                        value={newSchJudul}
                        onChange={(e) => setNewSchJudul(e.target.value)}
                        placeholder="Nama Kegiatan / Acara *"
                        className="px-3 py-2 rounded-lg bg-[#03251c] border border-emerald-700 text-xs text-white"
                      />
                      <input
                        type="text"
                        value={newSchKat}
                        onChange={(e) => setNewSchKat(e.target.value)}
                        placeholder="Kategori (Upacara / Bakti Sosial / dll)"
                        className="px-3 py-2 rounded-lg bg-[#03251c] border border-emerald-700 text-xs text-white"
                      />
                      <input
                        type="date"
                        value={newSchTanggal}
                        onChange={(e) => setNewSchTanggal(e.target.value)}
                        className="px-3 py-2 rounded-lg bg-[#03251c] border border-emerald-700 text-xs text-white"
                      />
                      <input
                        type="text"
                        value={newSchWaktu}
                        onChange={(e) => setNewSchWaktu(e.target.value)}
                        placeholder="Waktu (08:00 - 11:00 WITA)"
                        className="px-3 py-2 rounded-lg bg-[#03251c] border border-emerald-700 text-xs text-white"
                      />
                      <select
                        value={newSchLokasiId}
                        onChange={(e) => setNewSchLokasiId(e.target.value)}
                        className="px-3 py-2 rounded-lg bg-[#03251c] border border-emerald-700 text-xs text-white"
                      >
                        {appState.venues.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.nama}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={newSchPic}
                        onChange={(e) => setNewSchPic(e.target.value)}
                        placeholder="Koordinator / PIC"
                        className="px-3 py-2 rounded-lg bg-[#03251c] border border-emerald-700 text-xs text-white"
                      />
                      <select
                        value={newSchStatus}
                        onChange={(e) => setNewSchStatus(e.target.value as ScheduleStatus)}
                        className="px-3 py-2 rounded-lg bg-[#03251c] border border-emerald-700 text-xs text-white"
                      >
                        <option value="Terjadwal">Terjadwal</option>
                        <option value="Sedang Berlangsung">Sedang Berlangsung</option>
                        <option value="Ditunda/Pindah Lokasi">Ditunda/Pindah Lokasi</option>
                        <option value="Selesai">Selesai</option>
                      </select>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                      >
                        + Simpan Jadwal Acara
                      </button>
                    </div>
                  </form>

                  {/* Schedule Items List */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-200">
                      Daftar Jadwal Acara ({appState.schedules.length})
                    </h4>
                    {appState.schedules.map((s) => (
                      <div
                        key={s.id}
                        className="bg-[#021b15] border border-emerald-800/70 rounded-lg p-3 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <strong className="text-white">{s.judul}</strong>{' '}
                          <span className="text-amber-300">({s.kategori})</span> · {s.tanggal} ·{' '}
                          {s.lokasiNama}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateState((prev) => ({
                              ...prev,
                              schedules: prev.schedules.filter((x) => x.id !== s.id),
                            }))
                          }
                          className="p-1.5 rounded bg-rose-950 text-rose-300 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add 3D Venue Pin & Baksos Tracker */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-emerald-800">
                    <form
                      onSubmit={handleAddVenue}
                      className="bg-[#021b15] border border-emerald-800 rounded-xl p-4 space-y-3"
                    >
                      <h4 className="text-xs font-bold text-amber-300">
                        + Tambah Pin Lokasi Baru di Peta 2.5D Tojo Una-Una
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={newVenueNama}
                          onChange={(e) => setNewVenueNama(e.target.value)}
                          placeholder="Nama Venue / Lokasi *"
                          className="col-span-2 px-3 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-xs text-white"
                        />
                        <input
                          type="text"
                          value={newVenueGps}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewVenueGps(val);
                            const clean = val.replace(/\s+/g, '');
                            if (clean.includes(',')) {
                              setNewVenueMaps(`https://www.google.com/maps?q=${clean}`);
                            }
                          }}
                          placeholder="Koordinat GPS (Lat, Lng) mis. -0.9125845029778236, 121.58667527394272"
                          className="col-span-2 px-3 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-xs text-amber-200 font-mono-tabular"
                        />
                        <input
                          type="number"
                          value={newVenueX}
                          onChange={(e) => setNewVenueX(Number(e.target.value))}
                          placeholder="Koordinat X (-30 s/d 28)"
                          className="px-3 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-xs text-white"
                        />
                        <input
                          type="number"
                          value={newVenueZ}
                          onChange={(e) => setNewVenueZ(Number(e.target.value))}
                          placeholder="Koordinat Z (-16 s/d 14)"
                          className="px-3 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-xs text-white"
                        />
                        <select
                          value={newVenueArch}
                          onChange={(e) => setNewVenueArch(e.target.value as VenueArchetype)}
                          className="px-3 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-xs text-white"
                        >
                          <option value="kantor_kemenag">Gedung Kantor Kemenag</option>
                          <option value="lapangan_utama">Lapangan Terbuka</option>
                          <option value="gor_olahraga">GOR Olahraga</option>
                          <option value="masjid_agung">Masjid Agung</option>
                          <option value="aula_kerukunan">Aula Kerukunan</option>
                          <option value="pelabuhan_kepulauan">Zona Kepulauan</option>
                        </select>
                        <input
                          type="text"
                          value={newVenueMaps}
                          onChange={(e) => setNewVenueMaps(e.target.value)}
                          placeholder="Link Google Maps"
                          className="px-3 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-xs text-white"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs cursor-pointer"
                      >
                        Tambahkan Pin ke Peta 2.5D & GPS
                      </button>
                    </form>

                    <form
                      onSubmit={handleAddBaksos}
                      className="bg-[#021b15] border border-emerald-800 rounded-xl p-4 space-y-3"
                    >
                      <h4 className="text-xs font-bold text-amber-300">
                        + Tambah Indikator Dampak Bakti Sosial
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={newBaksosNama}
                          onChange={(e) => setNewBaksosNama(e.target.value)}
                          placeholder="Nama Program Baksos *"
                          className="col-span-2 px-3 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-xs text-white"
                        />
                        <input
                          type="number"
                          value={newBaksosCapaian}
                          onChange={(e) => setNewBaksosCapaian(Number(e.target.value))}
                          placeholder="Capaian Saat Ini"
                          className="px-3 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-xs text-white"
                        />
                        <input
                          type="number"
                          value={newBaksosTarget}
                          onChange={(e) => setNewBaksosTarget(Number(e.target.value))}
                          placeholder="Target Total"
                          className="px-3 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-xs text-white"
                        />
                        <input
                          type="text"
                          value={newBaksosSatuan}
                          onChange={(e) => setNewBaksosSatuan(e.target.value)}
                          placeholder="Satuan (Kantong / Paket / Titik)"
                          className="col-span-2 px-3 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-xs text-white"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs cursor-pointer"
                      >
                        Tambahkan Indikator Bakti Sosial
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* ===================================================================
                  TAB 3: MASTER SATKER / KONTINGEN & DATA PENDAFTAR LOMBA
                 =================================================================== */}
              {activeTab === 2 && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Satker CRUD */}
                  <div className="lg:col-span-5 bg-[#021b15] border border-emerald-800 rounded-xl p-4 space-y-4">
                    <h3 className="text-sm font-bold text-amber-300">
                      Master Satker / KUA / Madrasah ({appState.satkerList.length})
                    </h3>
                    <form onSubmit={handleAddSatker} className="flex gap-2">
                      <input
                        type="text"
                        value={newSatkerInput}
                        onChange={(e) => setNewSatkerInput(e.target.value)}
                        placeholder="Ketik nama Satker/KUA baru..."
                        className="flex-1 px-3 py-2 rounded-lg bg-[#03251c] border border-emerald-700 text-xs text-white"
                      />
                      <button
                        type="submit"
                        className="px-3.5 py-2 rounded-lg bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                      >
                        + Tambah
                      </button>
                    </form>
                    <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                      {appState.satkerList.map((s) => (
                        <div
                          key={s}
                          className="flex items-center justify-between bg-[#03251c] px-3 py-1.5 rounded-lg text-xs text-slate-200"
                        >
                          <span className="truncate">{s}</span>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateState((prev) => ({
                                ...prev,
                                satkerList: prev.satkerList.filter((item) => item !== s),
                              }))
                            }
                            className="text-rose-400 hover:text-rose-300 ml-2 cursor-pointer"
                          >
                            Hapus
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Registered Teams Management */}
                  <div className="lg:col-span-7 bg-[#021b15] border border-emerald-800 rounded-xl p-4 space-y-4">
                    <h3 className="text-sm font-bold text-amber-300">
                      Data Kontingen & Peserta Lomba Terdaftar ({appState.registrations.length})
                    </h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                      {appState.registrations.map((reg) => (
                        <div
                          key={reg.id}
                          className="bg-[#03251c] border border-emerald-800/70 rounded-lg p-3 flex items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <div className="font-bold text-white">
                              {reg.namaTimAtauPeserta} —{' '}
                              <span className="text-amber-300">{reg.competitionName}</span>
                            </div>
                            <div className="text-slate-300">
                              {reg.satker} · WA: {reg.kontakWhatsapp} · Pemain:{' '}
                              {reg.daftarPemain.join(', ')}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateState((prev) => ({
                                ...prev,
                                registrations: prev.registrations.filter((r) => r.id !== reg.id),
                              }))
                            }
                            className="p-1.5 rounded bg-rose-950 text-rose-300 cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ===================================================================
                  TAB 4: KUPON JALAN SEHAT & MODERASI UCAPAN
                 =================================================================== */}
              {activeTab === 3 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-[#021b15] border border-emerald-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-amber-300">
                        Data Kupon QR Jalan Sehat ({appState.coupons.length})
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateState((prev) => ({
                            ...prev,
                            coupons: prev.coupons.map((c) => ({
                              ...c,
                              sudahMenang: false,
                              hadiahDimenangkan: undefined,
                            })),
                          }));
                          notify('Status pemenang undian kupon berhasil direset.');
                        }}
                        className="text-xs text-emerald-300 underline cursor-pointer"
                      >
                        Reset Status Pemenang
                      </button>
                    </div>
                    <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                      {appState.coupons.map((c) => (
                        <div
                          key={c.id}
                          className="bg-[#03251c] px-3 py-2 rounded-lg text-xs flex items-center justify-between gap-2"
                        >
                          <div>
                            <span className="font-mono-tabular text-amber-300 font-bold mr-2">
                              {c.nomorKupon}
                            </span>
                            <strong className="text-white">{c.namaPeserta}</strong> ({c.satkerAtauUmum})
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateState((prev) => ({
                                ...prev,
                                coupons: prev.coupons.filter((x) => x.id !== c.id),
                              }))
                            }
                            className="text-rose-400 hover:text-rose-300 cursor-pointer"
                          >
                            Hapus
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#021b15] border border-emerald-800 rounded-xl p-4 space-y-3">
                    <h3 className="text-sm font-bold text-amber-300">
                      Moderasi Ucapan & Kotak Aspirasi ({appState.messages.length})
                    </h3>
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {appState.messages.map((m) => (
                        <div
                          key={m.id}
                          className="bg-[#03251c] p-3 rounded-lg text-xs flex items-start justify-between gap-3"
                        >
                          <div>
                            <div className="font-bold text-white">
                              {m.nama} <span className="text-amber-300">({m.kategori})</span>
                            </div>
                            <p className="text-slate-300 mt-0.5">{m.pesan}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateState((prev) => ({
                                  ...prev,
                                  messages: prev.messages.map((x) =>
                                    x.id === m.id ? { ...x, disetujui: !x.disetujui } : x
                                  ),
                                }))
                              }
                              className={`px-2 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                                m.disetujui
                                  ? 'bg-emerald-800 text-emerald-200'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {m.disetujui ? 'Tampil' : 'Tersembunyi'}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateState((prev) => ({
                                  ...prev,
                                  messages: prev.messages.filter((x) => x.id !== m.id),
                                }))
                              }
                              className="p-1 rounded bg-rose-950 text-rose-300 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ===================================================================
                  TAB 5: DYNAMIC BRANDING (LOGO HAB-81 UPLOAD, TEKS & GITHUB JSON SYNC)
                 =================================================================== */}
              {activeTab === 4 && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Dynamic Logo, Header Menu & Hero Texts Configuration */}
                  <div className="lg:col-span-7 bg-[#021b15] border border-emerald-800 rounded-xl p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-amber-300">
                        Edit Teks Header, Menu Navigasi, Judul Utama & Logo HAB ke-81
                      </h3>
                      {onActivateInlineEdit && (
                        <button
                          type="button"
                          onClick={onActivateInlineEdit}
                          className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Langsung di Halaman</span>
                        </button>
                      )}
                    </div>

                    {/* 1. Brand Wordmark & Menu Navigasi Atas */}
                    <div className="bg-[#03251c]/70 border border-emerald-800/80 rounded-xl p-3.5 space-y-3">
                      <div className="text-xs font-bold text-emerald-300">
                        1. Teks Pojok Kiri Atas & 5 Menu Navigasi Utama
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] text-slate-300 mb-1">
                            Nama Brand Kiri Atas (Default: HABKEMENAGTOUNA)
                          </label>
                          <input
                            type="text"
                            value={appState.branding.brandWordmark ?? 'HABKEMENAGTOUNA'}
                            onChange={(e) =>
                              onUpdateState((prev) => ({
                                ...prev,
                                branding: {
                                  ...prev.branding,
                                  brandWordmark: e.target.value,
                                },
                              }))
                            }
                            className="w-full px-3 py-1.5 rounded-lg bg-[#021b15] border border-emerald-700 text-xs text-amber-300 font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-300 mb-1">
                            Label Badge Pengumuman Atas (Default: INFO PANITIA)
                          </label>
                          <input
                            type="text"
                            value={appState.branding.tickerBadgeLabel ?? 'INFO PANITIA'}
                            onChange={(e) =>
                              onUpdateState((prev) => ({
                                ...prev,
                                branding: {
                                  ...prev.branding,
                                  tickerBadgeLabel: e.target.value,
                                },
                              }))
                            }
                            className="w-full px-3 py-1.5 rounded-lg bg-[#021b15] border border-emerald-700 text-xs text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {(
                          [
                            ['beranda', 'Menu 1 (Beranda 3D)'],
                            ['peta', 'Menu 2 (Peta Lokasi)'],
                            ['lomba', 'Menu 3 (Pendaftaran)'],
                            ['jadwal', 'Menu 4 (Jadwal & Baksos)'],
                            ['kupon', 'Menu 5 (Kupon QR)'],
                          ] as [keyof NavLabelsConfig, string][]
                        ).map(([key, label]) => {
                          const navObj = appState.branding.navLabels || {
                            beranda: 'Beranda 3D',
                            peta: 'Peta Lokasi',
                            lomba: 'Pendaftaran Lomba',
                            jadwal: 'Jadwal & Baksos',
                            kupon: 'Kupon Jalan Sehat',
                          };
                          return (
                            <div key={key}>
                              <label className="block text-[10px] text-slate-400 mb-0.5 truncate">
                                {label}
                              </label>
                              <input
                                type="text"
                                value={navObj[key]}
                                onChange={(e) =>
                                  onUpdateState((prev) => ({
                                    ...prev,
                                    branding: {
                                      ...prev.branding,
                                      navLabels: {
                                        ...navObj,
                                        [key]: e.target.value,
                                      },
                                    },
                                  }))
                                }
                                className="w-full px-2.5 py-1.5 rounded bg-[#021b15] border border-emerald-700 text-xs text-white"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 2. Judul Utama, Subjudul, Tagline & Baris Identitas */}
                    <div className="bg-[#03251c]/70 border border-emerald-800/80 rounded-xl p-3.5 space-y-3">
                      <div className="text-xs font-bold text-emerald-300">
                        2. Teks Judul Utama Hero, Subjudul & Tema/Tagline Resmi
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] text-slate-300 mb-1">
                            Judul Utama (Baris Besar Putih)
                          </label>
                          <input
                            type="text"
                            value={appState.branding.officialTitle}
                            onChange={(e) =>
                              onUpdateState((prev) => ({
                                ...prev,
                                branding: {
                                  ...prev.branding,
                                  officialTitle: e.target.value,
                                },
                              }))
                            }
                            className="w-full px-3 py-1.5 rounded-lg bg-[#021b15] border border-emerald-700 text-xs text-white font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-300 mb-1">
                            Subjudul Instansi (Baris Emas)
                          </label>
                          <input
                            type="text"
                            value={appState.branding.officialSubtitle}
                            onChange={(e) =>
                              onUpdateState((prev) => ({
                                ...prev,
                                branding: {
                                  ...prev.branding,
                                  officialSubtitle: e.target.value,
                                },
                              }))
                            }
                            className="w-full px-3 py-1.5 rounded-lg bg-[#021b15] border border-emerald-700 text-xs text-amber-300 font-semibold"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-300 mb-1">
                          Tema / Tagline Resmi HAB ke-81 Tahun 2027 (Teks Kutipan di Bawah Subjudul)
                        </label>
                        <input
                          type="text"
                          value={appState.branding.officialTagline}
                          onChange={(e) =>
                            onUpdateState((prev) => ({
                              ...prev,
                              branding: {
                                ...prev.branding,
                                officialTagline: e.target.value,
                              },
                            }))
                          }
                          className="w-full px-3 py-1.5 rounded-lg bg-[#021b15] border border-emerald-700 text-xs text-white"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] text-slate-300 mb-1">
                            Teks Identitas Samping Logo (Kemenag RI · Kab. Tojo Una-Una)
                          </label>
                          <input
                            type="text"
                            value={
                              appState.branding.heroEyebrow ?? 'Kemenag RI · Kab. Tojo Una-Una'
                            }
                            onChange={(e) =>
                              onUpdateState((prev) => ({
                                ...prev,
                                branding: {
                                  ...prev.branding,
                                  heroEyebrow: e.target.value,
                                },
                              }))
                            }
                            className="w-full px-3 py-1.5 rounded-lg bg-[#021b15] border border-emerald-700 text-xs text-white"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[11px] text-slate-300">
                              Keterangan Status Logo HAB ke-81
                            </label>
                            <label className="flex items-center gap-1 text-[10px] text-emerald-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={appState.branding.showHabStatusBadge}
                                onChange={(e) =>
                                  onUpdateState((prev) => ({
                                    ...prev,
                                    branding: {
                                      ...prev.branding,
                                      showHabStatusBadge: e.target.checked,
                                    },
                                  }))
                                }
                                className="accent-amber-400"
                              />
                              <span>Tampilkan</span>
                            </label>
                          </div>
                          <input
                            type="text"
                            value={appState.branding.habLogoStatusBadge}
                            onChange={(e) =>
                              onUpdateState((prev) => ({
                                ...prev,
                                branding: {
                                  ...prev.branding,
                                  habLogoStatusBadge: e.target.value,
                                },
                              }))
                            }
                            className="w-full px-3 py-1.5 rounded-lg bg-[#021b15] border border-emerald-700 text-xs text-emerald-300"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 3. Unggah Logo HAB ke-81 & Waktu Countdown */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Unggah File Logo HAB ke-81
                        </label>
                        <label className="w-full py-2 px-3 rounded-lg border border-dashed border-amber-400/60 bg-[#03251c] hover:bg-emerald-950 text-xs text-amber-200 font-semibold flex items-center justify-center gap-2 cursor-pointer">
                          <Upload className="w-4 h-4" />
                          <span>Pilih File Logo</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleHabLogoFileUpload}
                            className="hidden"
                          />
                        </label>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          URL Gambar Logo HAB ke-81
                        </label>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={appState.branding.habLogoCustomUrl}
                            onChange={(e) =>
                              onUpdateState((prev) => ({
                                ...prev,
                                branding: {
                                  ...prev.branding,
                                  habLogoCustomUrl: e.target.value,
                                },
                              }))
                            }
                            placeholder="Kosongkan = Emblem 81 Emas"
                            className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#03251c] border border-emerald-700 text-xs text-white"
                          />
                          {appState.branding.habLogoCustomUrl && (
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateState((prev) => ({
                                  ...prev,
                                  branding: {
                                    ...prev.branding,
                                    habLogoCustomUrl: '',
                                    habLogoStatusBadge:
                                      'Logo Sementara — Menunggu Rilis Resmi Pusat',
                                  },
                                }))
                              }
                              className="px-2 py-1.5 rounded-lg bg-rose-950 text-rose-200 text-xs cursor-pointer"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Target Countdown (WITA)
                        </label>
                        <input
                          type="text"
                          value={appState.branding.countdownTargetIso}
                          onChange={(e) =>
                            onUpdateState((prev) => ({
                              ...prev,
                              branding: {
                                ...prev.branding,
                                countdownTargetIso: e.target.value,
                              },
                            }))
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#03251c] border border-emerald-700 text-xs text-white font-mono-tabular"
                        />
                      </div>
                    </div>

                    {/* Running Text Ticker CRUD */}
                    <div className="pt-3 border-t border-emerald-800 space-y-2">
                      <label className="block text-xs font-bold text-amber-300">
                        Running Text Pengumuman Penting (Top Ticker)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newTickerInput}
                          onChange={(e) => setNewTickerInput(e.target.value)}
                          placeholder="Tambahkan pengumuman kilat panitia..."
                          className="flex-1 px-3 py-1.5 rounded-lg bg-[#03251c] border border-emerald-700 text-xs text-white"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!newTickerInput.trim()) return;
                            onUpdateState((prev) => ({
                              ...prev,
                              branding: {
                                ...prev.branding,
                                runningTextItems: [
                                  newTickerInput.trim(),
                                  ...prev.branding.runningTextItems,
                                ],
                              },
                            }));
                            setNewTickerInput('');
                            notify('Running text pengumuman ditambahkan.');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                        >
                          + Tambah
                        </button>
                      </div>
                      <div className="space-y-1.5 max-h-32 overflow-y-auto">
                        {appState.branding.runningTextItems.map((item, idx) => (
                          <div
                            key={idx}
                            className="bg-[#03251c] px-3 py-1.5 rounded text-xs flex items-center justify-between gap-2"
                          >
                            <span className="truncate text-slate-200">{item}</span>
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateState((prev) => ({
                                  ...prev,
                                  branding: {
                                    ...prev.branding,
                                    runningTextItems: prev.branding.runningTextItems.filter(
                                      (_, i) => i !== idx
                                    ),
                                  },
                                }))
                              }
                              className="text-rose-400 shrink-0 cursor-pointer"
                            >
                              Hapus
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* GitHub JSON Export / Import & Factory Reset */}
                  <div className="lg:col-span-5 bg-[#021b15] border border-emerald-800 rounded-xl p-5 flex flex-col justify-between space-y-5">
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" />
                        Sinkronisasi Live GitHub (Irfan45372/HABKEMENAGTOUNA)
                      </h3>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Ekspor seluruh database dinamis menjadi file{' '}
                        <code className="text-amber-300 font-mono-tabular">
                          hab81-kemenag-touna-2027-state.json
                        </code>{' '}
                        dan simpan di folder utama (root) repositori GitHub agar seluruh pengunjung website otomatis mendapatkan pembaruan terbaru Anda.
                      </p>

                      <button
                        type="button"
                        onClick={handleExportJson}
                        className="w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
                      >
                        <Download className="w-4 h-4" />
                        <span>1. Unduh File hab81-kemenag-touna-2027-state.json</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyJsonClipboard}
                        className="w-full py-2 px-4 rounded-xl bg-[#03251c] hover:bg-emerald-900 border border-amber-400/50 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>Atau Salin JSON ke Clipboard (Paste di GitHub)</span>
                      </button>

                      <button
                        type="button"
                        onClick={handlePullFromGitHub}
                        className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4 text-amber-300" />
                        <span>Tarik Data Live dari Repo GitHub Sekarang</span>
                      </button>

                      <label className="w-full py-2 px-4 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 border border-emerald-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer">
                        <Upload className="w-4 h-4 text-amber-300" />
                        <span>Impor / Pulihkan dari File JSON Lokal</span>
                        <input
                          type="file"
                          accept="application/json,.json"
                          onChange={handleImportJson}
                          className="hidden"
                        />
                      </label>

                      <div className="bg-[#03251c] border border-emerald-800/80 rounded-lg p-3 space-y-1.5 text-[11px] text-slate-300">
                        <div className="font-bold text-amber-300">
                          Cara Live Otomatis di GitHub Pages:
                        </div>
                        <ol className="list-decimal list-inside space-y-1">
                          <li>
                            Ekspor / Push kode proyek ini ke repo{' '}
                            <a
                              href="https://github.com/Irfan45372/HABKEMENAGTOUNA"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-amber-300 underline"
                            >
                              Irfan45372/HABKEMENAGTOUNA
                            </a>{' '}
                            (branch <code className="text-white">main</code>).
                          </li>
                          <li>
                            Di GitHub, buka <strong>Settings → Pages</strong>, lalu pada bagian{' '}
                            <strong>Build and deployment (Source)</strong> pilih{' '}
                            <strong className="text-emerald-300">GitHub Actions</strong>.
                          </li>
                          <li>
                            File workflow <code className="text-white">.github/workflows/deploy.yml</code>{' '}
                            otomatis mem-build & menayangkan web di{' '}
                            <span className="text-amber-300 font-mono-tabular">
                              https://irfan45372.github.io/HABKEMENAGTOUNA/
                            </span>
                            .
                          </li>
                        </ol>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-emerald-800 space-y-2">
                      <p className="text-[11px] text-slate-400">
                        Kembalikan seluruh data ke setelan awal bawaan Panitia HAB ke-81 Kemenag Kab. Tojo Una-Una:
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          onResetDefault();
                          notify('Database dikembalikan ke data awal HAB ke-81 Tojo Una-Una.');
                        }}
                        className="w-full py-2 px-4 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset ke Data Default Panitia</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Modal Footer */}
            <div className="px-6 py-3 bg-[#021b15] border-t border-emerald-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
              <span className="flex items-center gap-1.5 text-emerald-300">
                <Check className="w-3.5 h-3.5" />
                Auto-Persistence Aktif (localStorage)
              </span>
              <span>Pintasan Keyboard: Ctrl + Shift + A</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
