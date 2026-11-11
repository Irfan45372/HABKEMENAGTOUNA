import React, { useState } from 'react';
import { Competition, ScheduleEvent, VenueLocation } from '../types/hab';
import { buildDeepLink, shareToWhatsAppWithFullImage } from '../utils/shareUtils';
import {
  Calendar,
  Check,
  Compass,
  Edit3,
  ExternalLink,
  Globe,
  LocateFixed,
  Lock,
  MapPin,
  Navigation,
  Plus,
  Settings,
  Share2,
  Trash2,
  Trophy,
} from 'lucide-react';

interface VenueMap3DProps {
  venues: VenueLocation[];
  competitions: Competition[];
  schedules: ScheduleEvent[];
  selectedVenueId: string;
  onSelectVenue: (venueId: string) => void;
  onJumpToRegister: (competitionId: string) => void;
  adminPin?: string;
  isAdminUnlocked?: boolean;
  onUnlockAdmin?: () => void;
  onAddVenue?: (venue: VenueLocation) => void;
  onUpdateVenue?: (id: string, partial: Partial<VenueLocation>) => void;
  onDeleteVenue?: (id: string) => void;
  onOpenAdminMapTab?: () => void;
}

const KATEGORI_TITIK_OPTIONS = [
  'Titik Start / Finish Jalan Santai',
  'Pusat Upacara & Sekretariat Panitia',
  'Arena Lomba & Olahraga Porseni',
  'Lokasi Bakti Sosial & Lomba Seni',
  'Lokasi Kegiatan Keagamaan & Baksos',
  'Titik Kumpul Kontingen / Satker',
  'Posko Kesehatan / Konsumsi / Lainnya',
];

/**
 * Extracts "lat, lng" from either a raw coordinate string or a pasted Google Maps URL.
 */
function parseCoordinatesInput(raw: string): {
  lat: number;
  lng: number;
  cleanGps: string;
} | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Check @lat,lng in Google Maps URLs
  const atMatch = trimmed.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    const lat = Number(atMatch[1]);
    const lng = Number(atMatch[2]);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      return { lat, lng, cleanGps: `${lat}, ${lng}` };
    }
  }

  // Check q=lat,lng or query=lat,lng
  const qMatch = trimmed.match(/(?:q|query|ll)=(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
  if (qMatch) {
    const lat = Number(qMatch[1]);
    const lng = Number(qMatch[2]);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      return { lat, lng, cleanGps: `${lat}, ${lng}` };
    }
  }

  // Standard "lat, lng"
  const directMatch = trimmed.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (directMatch) {
    const lat = Number(directMatch[1]);
    const lng = Number(directMatch[2]);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      return { lat, lng, cleanGps: `${lat}, ${lng}` };
    }
  }

  return null;
}

export const VenueMap3D: React.FC<VenueMap3DProps> = ({
  venues,
  competitions,
  schedules,
  selectedVenueId,
  onSelectVenue,
  onJumpToRegister,
  adminPin = '812027',
  isAdminUnlocked = false,
  onUnlockAdmin,
  onAddVenue,
  onUpdateVenue,
  onDeleteVenue,
  onOpenAdminMapTab,
}) => {
  // Satellite ('h' = Google Satellite Hybrid with road labels) vs Standard ('m' = Google Road Map)
  const [mapLayerType, setMapLayerType] = useState<'h' | 'm'>('h');
  const [mapZoom, setMapZoom] = useState<number>(17);

  // Admin Inline Manage States
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [noticeMsg, setNoticeMsg] = useState('');

  // New Coordinate Point Form States
  const [newNama, setNewNama] = useState('');
  const [newKategori, setNewKategori] = useState<string>(KATEGORI_TITIK_OPTIONS[0]);
  const [newGpsInput, setNewGpsInput] = useState('-0.9125845029778236, 121.58667527394272');
  const [newAlamat, setNewAlamat] = useState('Ampana, Kab. Tojo Una-Una');
  const [newKapasitas, setNewKapasitas] = useState('Kumpul 06:00 WITA · Start 06:30 WITA');
  const [newDeskripsi, setNewDeskripsi] = useState('');
  const [locatingGps, setLocatingGps] = useState(false);

  // Editing Existing Venue State
  const [editingVenueId, setEditingVenueId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    nama: string;
    kategoriTitik: string;
    koordinatGps: string;
    alamat: string;
    kapasitas: string;
    deskripsi: string;
  }>({
    nama: '',
    kategoriTitik: '',
    koordinatGps: '',
    alamat: '',
    kapasitas: '',
    deskripsi: '',
  });

  const activeVenue = venues.find((v) => v.id === selectedVenueId) || venues[0] || null;

  const activeGpsString =
    activeVenue?.koordinatGps ||
    (typeof activeVenue?.latitude === 'number' && typeof activeVenue?.longitude === 'number'
      ? `${activeVenue.latitude}, ${activeVenue.longitude}`
      : '-0.9125845029778236, 121.58667527394272');

  const parsedActiveCoords = parseCoordinatesInput(activeGpsString);
  const activeGpsQuery = parsedActiveCoords
    ? `${parsedActiveCoords.lat},${parsedActiveCoords.lng}`
    : activeVenue?.koordinatGps?.trim() ||
      (typeof activeVenue?.latitude === 'number' && typeof activeVenue?.longitude === 'number'
        ? `${activeVenue.latitude},${activeVenue.longitude}`
        : '-0.9125845029778236,121.58667527394272');

  const venueCompetitions = competitions.filter((c) => c.lokasiId === activeVenue?.id);
  const venueSchedules = schedules.filter(
    (s) =>
      s.lokasiId === activeVenue?.id ||
      (activeVenue &&
        s.lokasiNama.toLowerCase().includes(activeVenue.nama.toLowerCase().slice(0, 12)))
  );

  const showNotice = (msg: string) => {
    setNoticeMsg(msg);
    window.setTimeout(() => setNoticeMsg(''), 3500);
  };

  const handleToggleAdminPanel = () => {
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

  const handleDetectMyLocation = (target: 'new' | 'edit') => {
    if (!('geolocation' in navigator)) {
      showNotice('Browser perangkat ini tidak mendukung sensor geolokasi otomatis.');
      return;
    }
    setLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocatingGps(false);
        const coordStr = `${pos.coords.latitude.toFixed(7)}, ${pos.coords.longitude.toFixed(7)}`;
        if (target === 'new') {
          setNewGpsInput(coordStr);
        } else {
          setEditForm((prev) => ({ ...prev, koordinatGps: coordStr }));
        }
        showNotice(`Titik GPS berhasil diambil dari lokasi perangkat: ${coordStr}`);
      },
      () => {
        setLocatingGps(false);
        showNotice('Gagal mengambil GPS otomatis. Pastikan izin lokasi aktif atau ketik manual.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleCreateNewVenue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNama.trim() || !onAddVenue) return;

    const parsed = parseCoordinatesInput(newGpsInput);
    const lat = parsed ? parsed.lat : -0.9125845029778236;
    const lng = parsed ? parsed.lng : 121.58667527394272;
    const cleanGps = `${lat}, ${lng}`;

    const created: VenueLocation = {
      id: `venue-${Date.now()}`,
      nama: newNama.trim(),
      kategoriTitik: newKategori.trim() || 'Titik Lokasi Kegiatan',
      alamat: newAlamat.trim() || 'Ampana, Kab. Tojo Una-Una',
      latitude: lat,
      longitude: lng,
      koordinatGps: cleanGps,
      googleMapsUrl: `https://www.google.com/maps?q=${lat},${lng}`,
      kapasitas: newKapasitas.trim() || 'Terbuka untuk Peserta HAB ke-81',
      deskripsi:
        newDeskripsi.trim() ||
        `Titik lokasi kegiatan ${newNama.trim()} (${newKategori}) pada rangkaian Hari Amal Bakti ke-81 Kemenag Kab. Tojo Una-Una.`,
    };

    onAddVenue(created);
    onSelectVenue(created.id);
    setNewNama('');
    setNewDeskripsi('');
    showNotice(`Titik Koordinat "${created.nama}" (${cleanGps}) berhasil ditambahkan & disimpan ke Cloud.`);
  };

  const handleStartEditVenue = (v: VenueLocation) => {
    setEditingVenueId(v.id);
    setEditForm({
      nama: v.nama,
      kategoriTitik: v.kategoriTitik || KATEGORI_TITIK_OPTIONS[0],
      koordinatGps: v.koordinatGps || `${v.latitude ?? -0.9125845}, ${v.longitude ?? 121.5866752}`,
      alamat: v.alamat,
      kapasitas: v.kapasitas,
      deskripsi: v.deskripsi,
    });
  };

  const handleSaveEditVenue = (id: string) => {
    if (!onUpdateVenue || !editForm.nama.trim()) return;
    const rawGps = editForm.koordinatGps.trim();
    const parsed = parseCoordinatesInput(rawGps);

    if (parsed) {
      const cleanGps = `${parsed.lat}, ${parsed.lng}`;
      onUpdateVenue(id, {
        nama: editForm.nama.trim(),
        kategoriTitik: editForm.kategoriTitik.trim() || 'Titik Lokasi Kegiatan',
        alamat: editForm.alamat.trim(),
        latitude: parsed.lat,
        longitude: parsed.lng,
        koordinatGps: cleanGps,
        googleMapsUrl: `https://www.google.com/maps?q=${parsed.lat},${parsed.lng}`,
        kapasitas: editForm.kapasitas.trim(),
        deskripsi: editForm.deskripsi.trim(),
      });
    } else {
      // Allows Admin to also type a place name / address query if exact coordinates are not known yet
      const searchQuery = rawGps || `${editForm.nama.trim()}, Ampana, Tojo Una-Una`;
      onUpdateVenue(id, {
        nama: editForm.nama.trim(),
        kategoriTitik: editForm.kategoriTitik.trim() || 'Titik Lokasi Kegiatan',
        alamat: editForm.alamat.trim(),
        latitude: undefined,
        longitude: undefined,
        koordinatGps: searchQuery,
        googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          searchQuery
        )}`,
        kapasitas: editForm.kapasitas.trim(),
        deskripsi: editForm.deskripsi.trim(),
      });
    }

    setEditingVenueId(null);
    showNotice(`Titik Lokasi & Koordinat "${editForm.nama.trim()}" berhasil diperbarui & disimpan ke Cloud.`);
  };

  const handleShareVenueToWa = async (v: VenueLocation) => {
    const gpsStr =
      v.koordinatGps || `${v.latitude ?? -0.9125845029778236}, ${v.longitude ?? 121.58667527394272}`;
    const mapsLink = `https://www.google.com/maps?q=${encodeURIComponent(gpsStr.replace(/\s+/g, ''))}`;
    const portalLink = buildDeepLink({ menu: 'peta' });

    const waText =
      `📍 *TITIK KOORDINAT & LOKASI KEGIATAN HAB KE-81 KEMENAG TOJO UNA-UNA*\n` +
      `_by HUMAS KEMENTERIAN AGAMA KABUPATEN TOJO UNA UNA_\n\n` +
      `*${v.nama}*\n` +
      `• Kategori: ${v.kategoriTitik || 'Titik Pelaksanaan Resmi'}\n` +
      `• Alamat / Patokan: ${v.alamat}\n` +
      `• Info Waktu / Kapasitas: ${v.kapasitas}\n` +
      `• Titik Koordinat GPS: ${gpsStr}\n\n` +
      `${v.deskripsi}\n\n` +
      `🗺️ *Buka Titik di Google Maps Satelit:*\n${mapsLink}\n\n` +
      `🔗 *Portal Resmi HAB ke-81:*\n${portalLink}`;

    await shareToWhatsAppWithFullImage({
      title: `Lokasi ${v.nama} — HAB ke-81 Kemenag Touna`,
      waText,
    });
  };

  const showAdminManager = isAdminUnlocked && isManageOpen;

  return (
    <section
      id="peta-lokasi"
      aria-label="Peta GPS Satelit & Titik Koordinat Kegiatan Kabupaten Tojo Una-Una"
      className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-emerald-900/70"
    >
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold text-amber-300 tracking-wide mb-1">
            01. Peta GPS Satelit & Titik Koordinat Resmi HAB ke-81
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white [text-wrap:balance]">
            Peta GPS Satelit & Titik Lokasi Kegiatan Kabupaten Tojo Una-Una
          </h2>
          <p className="text-sm text-slate-300 mt-1.5 max-w-2xl">
            Pilih titik lokasi di bawah untuk melihat peta satelit GPS secara langsung (termasuk Titik Kumpul & Start Jalan Santai, Kantor Kemenag, GOR, dan lokasi kegiatan lainnya) beserta petunjuk arah Google Maps.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleToggleAdminPanel}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border transition-colors ${
              showAdminManager
                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow'
                : 'bg-[#03251c] hover:bg-emerald-900 text-amber-300 border-amber-400/50'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>
              {showAdminManager
                ? 'Tutup Form Titik Koordinat'
                : '+ Input / Edit Titik Koordinat (Admin)'}
            </span>
          </button>

          {onOpenAdminMapTab && (
            <button
              type="button"
              onClick={onOpenAdminMapTab}
              className="px-3 py-2 rounded-xl bg-[#021b15] hover:bg-emerald-950 border border-emerald-800 text-emerald-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              title="Buka Pengaturan Lengkap di Panel Admin (Tab 2)"
            >
              <Settings className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">Panel Admin (Tab 2)</span>
            </button>
          )}
        </div>
      </div>

      {/* PIN Prompt when Admin clicks + Input / Edit Titik Koordinat while locked */}
      {showPinPrompt && !isAdminUnlocked && (
        <form
          onSubmit={handleVerifyPin}
          className="mb-6 p-4 rounded-2xl bg-[#021b15] border-2 border-amber-400/60 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>
                Masukkan PIN Admin untuk Menambah / Mengedit Titik Koordinat GPS (Start Jalan Santai, Lokasi Acara, dll.)
              </span>
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
              Buka Input Titik Koordinat
            </button>
          </div>
          {pinError && <p className="text-xs text-rose-400 font-semibold">{pinError}</p>}
        </form>
      )}

      {/* Notification Toast */}
      {noticeMsg && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-emerald-900/90 border border-amber-400/50 text-emerald-100 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-amber-300 shrink-0" />
          <span>{noticeMsg}</span>
        </div>
      )}

      {/* Admin Direct GPS Coordinate Input & Management Panel */}
      {showAdminManager && (
        <div className="mb-8 p-5 rounded-2xl bg-[#021b15] border-2 border-amber-400/60 space-y-6 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-800/80 pb-3">
            <div>
              <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>
                  Panel Input & Edit Titik Koordinat GPS Kegiatan (Start Jalan Santai, Lomba, Upacara & Baksos)
                </span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Anda dapat mengetik langsung koordinat Latitude, Longitude (dari Google Maps), menempelkan link Google Maps, atau menekan tombol Ambil GPS Lokasi Saya.
              </p>
            </div>
          </div>

          {/* Form Add New Coordinate Checkpoint */}
          {onAddVenue && (
            <form
              onSubmit={handleCreateNewVenue}
              className="p-4 rounded-xl bg-[#03251c] border border-emerald-700/80 space-y-3.5"
            >
              <div className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                + Tambah Titik Koordinat Lokasi Baru
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Nama Titik / Lokasi Kegiatan *
                  </label>
                  <input
                    type="text"
                    required
                    value={newNama}
                    onChange={(e) => setNewNama(e.target.value)}
                    placeholder="Contoh: Titik Pertemuan & Start Jalan Santai Kerukunan"
                    className="w-full px-3 py-2 rounded-lg bg-[#021b15] border border-emerald-700 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Kategori Titik Kegiatan
                  </label>
                  <input
                    type="text"
                    list="kategori-titik-list"
                    value={newKategori}
                    onChange={(e) => setNewKategori(e.target.value)}
                    placeholder="Pilih atau ketik kategori titik..."
                    className="w-full px-3 py-2 rounded-lg bg-[#021b15] border border-emerald-700 text-xs text-amber-200 focus:outline-none focus:border-amber-400"
                  />
                  <datalist id="kategori-titik-list">
                    {KATEGORI_TITIK_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-semibold text-amber-300 mb-1">
                    Titik Koordinat GPS (Latitude, Longitude) atau Tempel Link Google Maps *
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      required
                      value={newGpsInput}
                      onChange={(e) => setNewGpsInput(e.target.value)}
                      placeholder="Contoh: -0.9125845029778236, 121.58667527394272"
                      className="flex-1 px-3 py-2 rounded-lg bg-[#021b15] border border-amber-400/60 text-xs text-amber-300 font-mono-tabular focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      disabled={locatingGps}
                      onClick={() => handleDetectMyLocation('new')}
                      className="px-3.5 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-amber-200 text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <LocateFixed className="w-3.5 h-3.5" />
                      <span>{locatingGps ? 'Mengambil GPS...' : 'Ambil Titik GPS Lokasi Saya'}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Alamat Lengkap / Patokan Lokasi
                  </label>
                  <input
                    type="text"
                    value={newAlamat}
                    onChange={(e) => setNewAlamat(e.target.value)}
                    placeholder="Contoh: Depan Kantor Kemenag Kab. Tojo Una-Una, Jl. Merdeka"
                    className="w-full px-3 py-2 rounded-lg bg-[#021b15] border border-emerald-700 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Info Waktu Kumpul / Kapasitas Peserta
                  </label>
                  <input
                    type="text"
                    value={newKapasitas}
                    onChange={(e) => setNewKapasitas(e.target.value)}
                    placeholder="Contoh: Kumpul Pukul 06:00 WITA · Start 06:30 WITA"
                    className="w-full px-3 py-2 rounded-lg bg-[#021b15] border border-emerald-700 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Deskripsi / Keterangan Rangkaian Kegiatan di Titik Ini
                  </label>
                  <textarea
                    rows={2}
                    value={newDeskripsi}
                    onChange={(e) => setNewDeskripsi(e.target.value)}
                    placeholder="Contoh: Titik kumpul peserta jalan santai, pembagian kupon jalan sehat, senam pagi, dan pelepasan peserta..."
                    className="w-full px-3 py-2 rounded-lg bg-[#021b15] border border-emerald-700 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <Plus className="w-4 h-4" />
                  <span>Simpan & Tambahkan Titik Koordinat ke Peta GPS</span>
                </button>
              </div>
            </form>
          )}

          {/* Existing Coordinate Points List with Edit & Delete */}
          <div className="space-y-2.5">
            <div className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
              Daftar Titik Koordinat Saat Ini ({venues.length} Titik Lokasi) — Klik Edit untuk Mengubah Koordinat
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
              {venues.map((v) => {
                const isEditing = editingVenueId === v.id;
                const gpsText =
                  v.koordinatGps ||
                  `${v.latitude ?? -0.9125845029778236}, ${v.longitude ?? 121.58667527394272}`;

                return (
                  <div
                    key={v.id}
                    className="p-3.5 rounded-xl bg-[#03251c] border border-emerald-800/90 space-y-2.5 text-xs"
                  >
                    {isEditing ? (
                      <div className="space-y-2">
                        <div className="text-[11px] font-bold text-amber-300">
                          Edit Titik Lokasi: {v.nama}
                        </div>
                        <input
                          type="text"
                          value={editForm.nama}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, nama: e.target.value }))
                          }
                          placeholder="Nama Titik Lokasi"
                          className="w-full px-2.5 py-1.5 rounded bg-[#021b15] border border-emerald-700 text-white font-bold text-xs"
                        />
                        <input
                          type="text"
                          list="kategori-titik-list"
                          value={editForm.kategoriTitik}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, kategoriTitik: e.target.value }))
                          }
                          placeholder="Kategori Titik"
                          className="w-full px-2.5 py-1.5 rounded bg-[#021b15] border border-emerald-700 text-amber-200 text-xs"
                        />
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={editForm.koordinatGps}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, koordinatGps: e.target.value }))
                            }
                            placeholder="Latitude, Longitude GPS"
                            className="flex-1 px-2.5 py-1.5 rounded bg-[#021b15] border border-amber-400 text-amber-300 font-mono-tabular text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => handleDetectMyLocation('edit')}
                            className="px-2.5 py-1.5 rounded bg-emerald-800 hover:bg-emerald-700 text-amber-200 text-[11px] font-semibold cursor-pointer shrink-0"
                            title="Gunakan titik GPS perangkat saat ini"
                          >
                            GPS Saya
                          </button>
                        </div>
                        <input
                          type="text"
                          value={editForm.alamat}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, alamat: e.target.value }))
                          }
                          placeholder="Alamat / Patokan"
                          className="w-full px-2.5 py-1.5 rounded bg-[#021b15] border border-emerald-700 text-slate-200 text-xs"
                        />
                        <input
                          type="text"
                          value={editForm.kapasitas}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, kapasitas: e.target.value }))
                          }
                          placeholder="Waktu Kumpul / Kapasitas"
                          className="w-full px-2.5 py-1.5 rounded bg-[#021b15] border border-emerald-700 text-slate-200 text-xs"
                        />
                        <textarea
                          rows={2}
                          value={editForm.deskripsi}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, deskripsi: e.target.value }))
                          }
                          placeholder="Deskripsi kegiatan di titik ini"
                          className="w-full px-2.5 py-1.5 rounded bg-[#021b15] border border-emerald-700 text-slate-200 text-xs"
                        />
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingVenueId(null)}
                            className="px-3 py-1 rounded bg-slate-800 text-slate-300 text-[11px] font-semibold cursor-pointer"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEditVenue(v.id)}
                            className="px-3 py-1 rounded bg-amber-400 text-slate-950 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                            <span>Simpan</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                              {v.kategoriTitik || 'Titik Pelaksanaan Resmi'}
                            </div>
                            <div className="font-bold text-white text-xs mt-0.5">{v.nama}</div>
                            <div className="text-[11px] text-emerald-300 font-mono-tabular mt-0.5">
                              GPS: {gpsText}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                              {v.alamat}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartEditVenue(v)}
                              className="px-2.5 py-1 rounded bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40 text-amber-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            {onDeleteVenue && venues.length > 1 && (
                              <button
                                type="button"
                                onClick={() => onDeleteVenue(v.id)}
                                className="p-1.5 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-700/50 cursor-pointer"
                                title="Hapus Titik Lokasi"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Accessible Checkpoint Selector Strip */}
      <div
        role="tablist"
        aria-label="Daftar Titik Koordinat Lokasi HAB ke-81"
        className="mb-6 flex flex-wrap items-center gap-2 bg-[#03221a] p-2.5 rounded-2xl border border-emerald-800/80 max-h-40 overflow-y-auto"
      >
        {venues.map((v) => {
          const isSelected = v.id === activeVenue?.id;
          return (
            <button
              key={v.id}
              role="tab"
              aria-selected={isSelected}
              type="button"
              onClick={() => onSelectVenue(v.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                isSelected
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-md'
                  : 'bg-[#021b15]/80 text-slate-200 hover:text-white hover:bg-emerald-900/60 border border-emerald-800/60'
              }`}
            >
              <MapPin
                className={`w-3.5 h-3.5 shrink-0 ${
                  isSelected ? 'text-slate-950' : 'text-amber-400'
                }`}
              />
              <span>{v.nama}</span>
            </button>
          );
        })}
      </div>

      {/* Main 2-Column Split: Left Pure GPS Satellite/Maps Embed, Right Dynamic Checkpoint Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Interactive GPS Satellite / Maps Viewport */}
        <div className="lg:col-span-7 relative min-h-[440px] sm:min-h-[500px] rounded-2xl overflow-hidden border border-emerald-800/80 bg-[#03221a] flex flex-col justify-between shadow-xl">
          {/* Top Bar: Active GPS Coordinate Pill + Satellite / Standard Map Switcher + Zoom */}
          <div className="relative z-10 p-3 bg-[#021b15]/95 border-b border-emerald-800/80 flex flex-wrap items-center justify-between gap-2">
            <div className="bg-[#03251c] border border-emerald-700/80 rounded-lg px-3 py-1.5 text-xs text-emerald-200 flex items-center gap-2">
              <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="font-mono-tabular font-semibold">GPS: {activeGpsString}</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {/* Satellite vs Road Map Switcher */}
              <div className="flex items-center gap-1 bg-[#03251c] border border-emerald-700/80 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setMapLayerType('h')}
                  className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer transition-colors flex items-center gap-1 ${
                    mapLayerType === 'h'
                      ? 'bg-amber-400 text-slate-950'
                      : 'text-slate-200 hover:text-white'
                  }`}
                >
                  <Globe className="w-3 h-3" />
                  <span>Peta GPS Satelit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMapLayerType('m')}
                  className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer transition-colors ${
                    mapLayerType === 'm'
                      ? 'bg-amber-400 text-slate-950'
                      : 'text-slate-200 hover:text-white'
                  }`}
                >
                  Peta Maps Standar
                </button>
              </div>

              {/* Zoom Level Selector */}
              <select
                aria-label="Tingkat Zoom Peta GPS"
                value={mapZoom}
                onChange={(e) => setMapZoom(Number(e.target.value))}
                className="px-2.5 py-1.5 rounded-lg bg-[#03251c] border border-emerald-700/80 text-xs text-amber-300 font-semibold cursor-pointer focus:outline-none"
              >
                <option value={19}>Zoom Dekat (19x)</option>
                <option value={17}>Zoom Detail (17x)</option>
                <option value={15}>Zoom Kawasan (15x)</option>
                <option value={12}>Zoom Kabupaten (12x)</option>
              </select>
            </div>
          </div>

          {/* Embedded Google Maps GPS / Satellite Iframe */}
          <div className="relative flex-1 w-full min-h-[340px] bg-[#021b15]">
            <iframe
              key={`${activeGpsQuery}-${mapLayerType}-${mapZoom}`}
              title={`Peta GPS Satelit ${activeVenue?.nama || 'Kantor Kemenag Kab. Tojo Una-Una'}`}
              src={`https://maps.google.com/maps?q=${encodeURIComponent(activeGpsQuery)}&hl=id&z=${mapZoom}&t=${mapLayerType}&output=embed`}
              className="absolute inset-0 w-full h-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>

          {/* Bottom Status Bar */}
          <div className="relative z-10 p-3 bg-[#021b15]/95 border-t border-emerald-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="text-slate-300 truncate">
              Titik Terpilih:{' '}
              <strong className="text-amber-300">{activeVenue?.nama || '-'}</strong>
            </div>
            <div className="font-mono-tabular text-emerald-300 shrink-0">
              Koordinat: {activeGpsString}
            </div>
          </div>
        </div>

        {/* Right: Selected Checkpoint Details, Active Competitions & Schedule */}
        <div className="lg:col-span-5 bg-[#03251c] border border-emerald-800/80 rounded-2xl p-6 flex flex-col justify-between space-y-5 shadow-xl max-h-[540px] overflow-y-auto">
          {activeVenue ? (
            <>
              <div className="space-y-4">
                <div className="border-b border-emerald-800/70 pb-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <span className="px-2.5 py-0.5 rounded-md bg-amber-400/15 border border-amber-400/40 text-[11px] text-amber-300 font-bold">
                      {activeVenue.kategoriTitik || 'Titik Pelaksanaan Resmi'}
                    </span>
                    <span className="text-xs text-emerald-300 font-semibold">
                      {activeVenue.kapasitas}
                    </span>
                  </div>

                  <h3
                    data-testid="selected-venue-title"
                    className="text-xl font-bold text-white"
                  >
                    {activeVenue.nama}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">{activeVenue.alamat}</p>

                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-2 bg-[#021b15] border border-emerald-800/80 rounded-lg px-3 py-1.5 text-xs font-mono-tabular text-amber-300">
                      <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Koordinat GPS: {activeGpsString}</span>
                    </div>

                    {onUpdateVenue && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!isAdminUnlocked) {
                            setShowPinPrompt(true);
                            handleStartEditVenue(activeVenue);
                          } else if (editingVenueId === activeVenue.id) {
                            setEditingVenueId(null);
                          } else {
                            handleStartEditVenue(activeVenue);
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                        title="Ubah Titik Koordinat GPS, Nama Tempat, atau Alamat Lokasi Ini"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>
                          {editingVenueId === activeVenue.id && isAdminUnlocked
                            ? 'Tutup Edit Lokasi'
                            : 'Ubah Titik Koordinat / Lokasi Ini'}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Direct Inline Edit Form for the Selected Location right inside the Right Card */}
                  {isAdminUnlocked && editingVenueId === activeVenue.id && (
                    <div className="mt-4 p-4 rounded-xl bg-[#021b15] border-2 border-amber-400/70 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-300">
                          Ubah Titik Koordinat & Detail Lokasi: {activeVenue.nama}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingVenueId(null)}
                          className="text-[11px] text-slate-400 hover:text-white cursor-pointer"
                        >
                          Batal
                        </button>
                      </div>

                      <div className="space-y-2.5 text-xs">
                        <div>
                          <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                            Nama Tempat / Lokasi (Bisa diganti jika pindah tempat)
                          </label>
                          <input
                            type="text"
                            value={editForm.nama}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, nama: e.target.value }))
                            }
                            placeholder="Contoh: GOR Olahraga & Lapangan Voli/Futsal Ampana"
                            className="w-full px-3 py-1.5 rounded-lg bg-[#03251c] border border-emerald-700 text-white font-bold text-xs focus:outline-none focus:border-amber-400"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-amber-300 font-semibold mb-1">
                            Titik Koordinat GPS (Lat, Lng), Link Google Maps, atau Ketik Nama Tempat
                          </label>
                          <div className="flex flex-col sm:flex-row gap-1.5">
                            <input
                              type="text"
                              value={editForm.koordinatGps}
                              onChange={(e) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  koordinatGps: e.target.value,
                                }))
                              }
                              placeholder="Misal: -0.9125845, 121.5866752 atau ketik nama tempat..."
                              className="flex-1 px-3 py-1.5 rounded-lg bg-[#03251c] border border-amber-400 text-amber-300 font-mono-tabular text-xs focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleDetectMyLocation('edit')}
                              className="px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-amber-200 text-[11px] font-bold flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                            >
                              <LocateFixed className="w-3.5 h-3.5" />
                              <span>Ambil GPS Saya</span>
                            </button>
                          </div>
                          {/* Quick Preset Coordinates in Ampana */}
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] text-slate-400">Pilih Cepat:</span>
                            <button
                              type="button"
                              onClick={() =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  koordinatGps: '-0.9125845029778236, 121.58667527394272',
                                  alamat:
                                    'Kompleks Perkantoran Bumi Mas / Kantor Kemenag Kab. Tojo Una-Una',
                                }))
                              }
                              className="px-2 py-0.5 rounded bg-emerald-900/80 hover:bg-emerald-800 text-[10px] text-emerald-200 border border-emerald-700 cursor-pointer"
                            >
                              Halaman Kantor Kemenag / Bumi Mas
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  koordinatGps: '-0.867912, 121.583421',
                                  alamat: 'Lapangan Taman JH Ampana, Kec. Ampana Kota',
                                }))
                              }
                              className="px-2 py-0.5 rounded bg-emerald-900/80 hover:bg-emerald-800 text-[10px] text-emerald-200 border border-emerald-700 cursor-pointer"
                            >
                              Lapangan Taman JH Ampana
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  koordinatGps: 'GOR Ampana Kota, Tojo Una-Una',
                                }))
                              }
                              className="px-2 py-0.5 rounded bg-emerald-900/80 hover:bg-emerald-800 text-[10px] text-emerald-200 border border-emerald-700 cursor-pointer"
                            >
                              Cari GOR Ampana di Maps
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                              Kategori Titik
                            </label>
                            <input
                              type="text"
                              list="kategori-titik-list"
                              value={editForm.kategoriTitik}
                              onChange={(e) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  kategoriTitik: e.target.value,
                                }))
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg bg-[#03251c] border border-emerald-700 text-amber-200 text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                              Waktu / Kapasitas
                            </label>
                            <input
                              type="text"
                              value={editForm.kapasitas}
                              onChange={(e) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  kapasitas: e.target.value,
                                }))
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg bg-[#03251c] border border-emerald-700 text-white text-xs"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                            Alamat / Patokan Lokasi
                          </label>
                          <input
                            type="text"
                            value={editForm.alamat}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, alamat: e.target.value }))
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#03251c] border border-emerald-700 text-white text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                            Deskripsi Kegiatan di Titik Ini
                          </label>
                          <textarea
                            rows={2}
                            value={editForm.deskripsi}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, deskripsi: e.target.value }))
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#03251c] border border-emerald-700 text-white text-xs"
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingVenueId(null)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEditVenue(activeVenue.id)}
                            className="px-4 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Simpan Perubahan Titik Lokasi</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <p className="text-sm text-slate-200 mt-3 leading-relaxed">
                    {activeVenue.deskripsi}
                  </p>
                </div>

                {/* Active Competitions at this Venue */}
                <div>
                  <h4 className="text-xs font-semibold text-emerald-300 mb-2.5 flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    Cabang Lomba di Titik Ini ({venueCompetitions.length})
                  </h4>
                  {venueCompetitions.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">
                      Titik ini berfokus pada kegiatan seremonial, titik kumpul jalan santai, atau bakti sosial.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {venueCompetitions.map((comp) => (
                        <div
                          key={comp.id}
                          className="bg-[#021b15] border border-emerald-800/60 rounded-lg p-2.5 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-white truncate">
                              {comp.nama}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {comp.kategori} · {comp.jenisPeserta} · {comp.jadwalRingkas}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onJumpToRegister(comp.id)}
                            className="px-2.5 py-1 rounded bg-emerald-800 hover:bg-emerald-700 text-amber-200 text-[11px] font-medium shrink-0 cursor-pointer whitespace-nowrap"
                          >
                            Daftar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Dynamic Schedule Events at this Venue */}
                <div>
                  <h4 className="text-xs font-semibold text-emerald-300 mb-2.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    Agenda & Jadwal Rangkaian Acara ({venueSchedules.length})
                  </h4>
                  {venueSchedules.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">
                      Mengikuti jadwal umum Panitia HAB ke-81.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                      {venueSchedules.map((sch) => (
                        <div
                          key={sch.id}
                          className="bg-[#021b15] border border-emerald-800/60 rounded-lg p-2.5 text-xs"
                        >
                          <div className="font-semibold text-white">{sch.judul}</div>
                          <div className="text-[11px] text-amber-300/90 mt-0.5 font-mono-tabular">
                            {sch.tanggal} · {sch.waktu} · Status: {sch.status}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons: Direct Google Maps Route + WhatsApp Share */}
              <div className="pt-3 border-t border-emerald-800/70 flex flex-col sm:flex-row gap-2.5">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    activeGpsQuery
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-colors"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Buka Petunjuk Arah Google Maps</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  type="button"
                  onClick={() => handleShareVenueToWa(activeVenue)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs transition-colors cursor-pointer shrink-0"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Bagikan Lokasi ke WA</span>
                </button>
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-400">Pilih titik lokasi pada daftar di atas.</div>
          )}
        </div>
      </div>
    </section>
  );
};
