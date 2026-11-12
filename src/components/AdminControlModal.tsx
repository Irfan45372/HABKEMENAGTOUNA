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
  SatkerBannerCategory,
  SatkerBannerItem,
  ScheduleEvent,
  ScheduleStatus,
  VenueArchetype,
  VenueLocation,
  VideoItem,
} from '../types/hab';
import { DEFAULT_APP_STATE } from '../data/defaultState';
import {
  compressBannerImageFile,
  extractYoutubeEmbedUrl,
  normalizeBannerImageUrl,
  validateImportedState,
} from '../utils/habLogic';
import {
  Check,
  Cloud,
  Download,
  Edit3,
  FileText,
  Lock,
  Plus,
  RotateCcw,
  Settings,
  ShieldCheck,
  Trash2,
  Unlock,
  Upload,
  Video,
  X,
} from 'lucide-react';
import {
  ADMIN_EMAIL,
  signInWithGoogleAdmin,
  signOutFirebase,
  syncFullStateToCloud,
  User,
} from '../firebase';
import {
  downloadJalanSehatPdfReport,
  downloadRegistrationsCsvReport,
  downloadRegistrationsPdfReport,
} from '../utils/pdfReportGenerator';

interface AdminControlModalProps {
  isOpen: boolean;
  initialTab?: number;
  appState: AppState;
  firebaseConnected?: boolean;
  currentUser?: User | null;
  isAdminUnlocked?: boolean;
  onUnlockAdmin?: () => void;
  onLockAdmin?: () => void;
  onClose: () => void;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
  onResetDefault: () => void;
  onActivateInlineEdit?: () => void;
}

export const AdminControlModal: React.FC<AdminControlModalProps> = ({
  isOpen,
  initialTab = 0,
  appState,
  firebaseConnected = false,
  currentUser = null,
  isAdminUnlocked = false,
  onUnlockAdmin,
  onLockAdmin,
  onClose,
  onUpdateState,
  onResetDefault,
  onActivateInlineEdit,
}) => {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(isAdminUnlocked);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<number>(initialTab);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [isSyncingCloud, setIsSyncingCloud] = useState<boolean>(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  useEffect(() => {
    setIsUnlocked(isAdminUnlocked);
  }, [isAdminUnlocked]);

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
  const [newCompJuknis, setNewCompJuknis] = useState('');
  const [newCompCatatan, setNewCompCatatan] = useState('');
  const [editingCompId, setEditingCompId] = useState<string | null>(null);

  // Tab 1: New Match Score State
  const [newMatchCompName, setNewMatchCompName] = useState(
    appState.competitions[0]?.nama || 'Bola Voli'
  );
  const [newMatchBabak, setNewMatchBabak] = useState('Penyisihan');
  const [newMatchA, setNewMatchA] = useState('');
  const [newMatchB, setNewMatchB] = useState('');
  const [newMatchSkorA, setNewMatchSkorA] = useState('0');
  const [newMatchSkorB, setNewMatchSkorB] = useState('0');

  // Tab 1: New Medal Standing Satker State
  const [newMedalSatker, setNewMedalSatker] = useState('');

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
  const [editingSchId, setEditingSchId] = useState<string | null>(null);

  // Tab 2: New GPS Coordinate / Venue State
  const [newVenueNama, setNewVenueNama] = useState('');
  const [newVenueKategori, setNewVenueKategori] = useState('Titik Start / Finish Jalan Santai');
  const [newVenueAlamat, setNewVenueAlamat] = useState('Ampana, Kab. Tojo Una-Una');
  const [newVenueGps, setNewVenueGps] = useState('-0.9125845029778236, 121.58667527394272');
  const [newVenueKapasitas, setNewVenueKapasitas] = useState('Kumpul 06:00 WITA · Start 06:30 WITA');
  const [newVenueDeskripsi, setNewVenueDeskripsi] = useState('');
  const [newVenueMaps, setNewVenueMaps] = useState(
    'https://www.google.com/maps?q=-0.9125845029778236,121.58667527394272'
  );

  // Tab 2: New Baksos Metric State
  const [newBaksosNama, setNewBaksosNama] = useState('');
  const [newBaksosTarget, setNewBaksosTarget] = useState<number>(100);
  const [newBaksosCapaian, setNewBaksosCapaian] = useState<number>(50);
  const [newBaksosSatuan, setNewBaksosSatuan] = useState('Paket');

  // Tab 3: New Satker & Inline Edit State
  const [newSatkerInput, setNewSatkerInput] = useState('');
  const [editingSatkerIdx, setEditingSatkerIdx] = useState<number | null>(null);
  const [editingSatkerValue, setEditingSatkerValue] = useState<string>('');
  const [editingRegId, setEditingRegId] = useState<string | null>(null);
  const [regPdfFilter, setRegPdfFilter] = useState<string>('ALL');

  // Tab 4: Video & YouTube State
  const [newVidJudul, setNewVidJudul] = useState('');
  const [newVidKat, setNewVidKat] = useState<string>('Dokumentasi Porseni & Baksos');
  const [newVidSatker, setNewVidSatker] = useState(
    appState.satkerList[0] || 'Kantor Kemenag Kab. Tojo Una-Una (Induk)'
  );
  const [newVidUrl, setNewVidUrl] = useState('');
  const [newVidDesc, setNewVidDesc] = useState('');
  const [editingVidId, setEditingVidId] = useState<string | null>(null);
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);

  // Tab 4: Satker Banner & Activity Photo State
  const [newBannerSatker, setNewBannerSatker] = useState(
    appState.satkerList[0] || 'Kantor Kemenag Kab. Tojo Una-Una (Induk)'
  );
  const [newBannerKat, setNewBannerKat] = useState<SatkerBannerCategory>('Spanduk & Banner Ucapan');
  const [newBannerJudul, setNewBannerJudul] = useState('');
  const [newBannerImageUrl, setNewBannerImageUrl] = useState('');
  const [newBannerUcapan, setNewBannerUcapan] = useState('');
  const [newBannerKet, setNewBannerKet] = useState('');
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);

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
      onUnlockAdmin?.();
      setPinError(null);
    } else {
      setPinError('Kode PIN Otorisasi tidak sesuai. Akses khusus Panitia Resmi HAB ke-81.');
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
      catatan:
        newCompCatatan.trim() ||
        'Peserta wajib melakukan registrasi daring melalui portal HABKEMENAGTOUNA dan hadir 30 menit sebelum jadwal pertandingan.',
    };
    onUpdateState((prev) => ({
      ...prev,
      competitions: [item, ...prev.competitions],
    }));
    setNewCompNama('');
    setNewCompJuknis('');
    setNewCompCatatan('');
    notify(`Cabang lomba "${item.nama}" beserta Juknis berhasil ditambahkan.`);
  };

  const handleUpdateCompetitionField = (id: string, partial: Partial<Competition>) => {
    onUpdateState((prev) => ({
      ...prev,
      competitions: prev.competitions.map((c) => (c.id === id ? { ...c, ...partial } : c)),
    }));
  };

  const handleUploadJuknisFile = (
    e: React.ChangeEvent<HTMLInputElement>,
    targetCompId?: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      notify(
        'Ukuran file Juknis maksimal 2 MB untuk unggah langsung. Untuk PDF ukuran besar, silakan unggah ke Google Drive lalu tempel link-nya di kolom Link Juknis.'
      );
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (targetCompId) {
        handleUpdateCompetitionField(targetCompId, { juknisUrl: dataUrl });
        notify(`File Juknis (${file.name}) berhasil diunggah ke cabang lomba.`);
      } else {
        setNewCompJuknis(dataUrl);
        notify(`File Juknis (${file.name}) siap disimpan bersama cabang lomba baru.`);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
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

  const handleUpdateMatch = (id: string, partial: Partial<MatchScore>) => {
    onUpdateState((prev) => ({
      ...prev,
      matches: prev.matches.map((m) => (m.id === id ? { ...m, ...partial } : m)),
    }));
  };

  const handleDeleteMatch = (id: string) => {
    onUpdateState((prev) => ({
      ...prev,
      matches: prev.matches.filter((m) => m.id !== id),
    }));
    notify('Data pertandingan dihapus.');
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

  const handleAddMedalRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedalSatker.trim()) return;
    const item: MedalStanding = {
      id: `medal-${Date.now()}`,
      satker: newMedalSatker.trim(),
      emas: 0,
      perak: 0,
      perunggu: 0,
    };
    onUpdateState((prev) => ({
      ...prev,
      medalStandings: [...prev.medalStandings, item],
    }));
    setNewMedalSatker('');
    notify(`Kontingen "${item.satker}" ditambahkan ke klasemen medali.`);
  };

  const handleDeleteMedalRow = (id: string) => {
    onUpdateState((prev) => ({
      ...prev,
      medalStandings: prev.medalStandings.filter((m) => m.id !== id),
    }));
    notify('Baris klasemen medali dihapus.');
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

  const handleUpdateSchedule = (id: string, partial: Partial<ScheduleEvent>) => {
    onUpdateState((prev) => ({
      ...prev,
      schedules: prev.schedules.map((s) => (s.id === id ? { ...s, ...partial } : s)),
    }));
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
      kategoriTitik: newVenueKategori.trim() || 'Titik Lokasi Kegiatan',
      alamat: newVenueAlamat.trim() || 'Ampana, Kab. Tojo Una-Una',
      latitude: parsedLat,
      longitude: parsedLng,
      koordinatGps: cleanGps,
      googleMapsUrl:
        newVenueMaps.trim() || `https://www.google.com/maps?q=${parsedLat},${parsedLng}`,
      deskripsi:
        newVenueDeskripsi.trim() ||
        'Titik pelaksanaan kegiatan resmi HAB ke-81 Kemenag Tojo Una-Una.',
      kapasitas: newVenueKapasitas.trim() || '500 Peserta',
    };
    onUpdateState((prev) => ({
      ...prev,
      venues: [...prev.venues, v],
    }));
    setNewVenueNama('');
    setNewVenueDeskripsi('');
    notify(`Titik Koordinat GPS "${v.nama}" (${cleanGps}) berhasil ditambahkan ke Peta Satelit.`);
  };

  const handleUpdateVenue = (id: string, partial: Partial<VenueLocation>) => {
    onUpdateState((prev) => ({
      ...prev,
      venues: prev.venues.map((v) => {
        if (v.id !== id) return v;
        const next = { ...v, ...partial };
        if (partial.koordinatGps !== undefined) {
          const parts = partial.koordinatGps.split(',').map((p) => Number(p.trim()));
          if (parts.length === 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
            next.latitude = parts[0];
            next.longitude = parts[1];
            next.googleMapsUrl = `https://www.google.com/maps?q=${parts[0]},${parts[1]}`;
          }
        }
        return next;
      }),
    }));
  };

  const handleDeleteVenue = (id: string) => {
    onUpdateState((prev) => ({
      ...prev,
      venues: prev.venues.filter((v) => v.id !== id),
    }));
    notify('Pin lokasi dihapus dari peta.');
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

  const handleUpdateBaksos = (id: string, partial: Partial<BaksosMetric>) => {
    onUpdateState((prev) => ({
      ...prev,
      baksosMetrics: prev.baksosMetrics.map((b) => (b.id === id ? { ...b, ...partial } : b)),
    }));
  };

  const handleDeleteBaksos = (id: string) => {
    onUpdateState((prev) => ({
      ...prev,
      baksosMetrics: prev.baksosMetrics.filter((b) => b.id !== id),
    }));
    notify('Indikator Bakti Sosial dihapus.');
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

  const handleSaveRenameSatker = (idx: number) => {
    const clean = editingSatkerValue.trim();
    if (!clean) return;
    onUpdateState((prev) => ({
      ...prev,
      satkerList: prev.satkerList.map((item, i) => (i === idx ? clean : item)),
    }));
    setEditingSatkerIdx(null);
    notify(`Nama Satker diperbarui menjadi "${clean}".`);
  };

  const handleAddVideoAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVidJudul.trim() || !newVidUrl.trim()) return;
    const cleanUrl = newVidUrl.trim();
    const isYt = Boolean(extractYoutubeEmbedUrl(cleanUrl));
    const item: VideoItem = {
      id: `vid-${Date.now()}`,
      judul: newVidJudul.trim(),
      kategori: newVidKat,
      satker: newVidSatker,
      sumberipe: isYt ? 'youtube' : 'direct_video',
      youtubeUrl: isYt ? cleanUrl : undefined,
      videoFileUrl: isYt ? undefined : cleanUrl,
      durasiLabel: isYt ? 'YouTube HD' : 'Video MP4',
      deskripsi: newVidDesc.trim() || 'Dokumentasi kegiatan HAB ke-81 Kemenag Tojo Una-Una.',
      waktuUpload: new Date().toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      disetujui: true,
    };
    onUpdateState((prev) => ({
      ...prev,
      videos: [item, ...(prev.videos ?? [])],
    }));
    setNewVidJudul('');
    setNewVidUrl('');
    setNewVidDesc('');
    notify(`Video "${item.judul}" berhasil ditambahkan ke Galeri.`);
  };

  const handleUpdateVideo = (id: string, partial: Partial<VideoItem>) => {
    onUpdateState((prev) => {
      const currentVideos = prev.videos ?? [];
      return {
        ...prev,
        videos: currentVideos.map((v) => {
          if (v.id !== id) return v;
          const next = { ...v, ...partial };
          if (partial.youtubeUrl !== undefined) {
            const isYt = Boolean(extractYoutubeEmbedUrl(partial.youtubeUrl));
            next.sumberipe = isYt ? 'youtube' : 'direct_video';
            if (!isYt) {
              next.videoFileUrl = partial.youtubeUrl;
            }
          }
          return next;
        }),
      };
    });
  };

  const handleDeleteVideo = (id: string) => {
    onUpdateState((prev) => {
      const currentVideos = prev.videos ?? [];
      return {
        ...prev,
        videos: currentVideos.filter((v) => v.id !== id),
      };
    });
    notify('Video berhasil dihapus dari galeri.');
  };

  const handleAddSatkerBannerAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBannerJudul.trim() || !newBannerImageUrl.trim()) {
      notify('Mohon isi Judul Spanduk/Foto dan unggah atau masukkan Link Gambar terlebih dahulu.');
      return;
    }
    const item: SatkerBannerItem = {
      id: `bnr-${Date.now()}`,
      satker: newBannerSatker,
      kategori: newBannerKat,
      judul: newBannerJudul.trim(),
      imageUrl: normalizeBannerImageUrl(newBannerImageUrl),
      bannerUcapan: newBannerUcapan.trim() || undefined,
      keterangan: newBannerKet.trim() || undefined,
      waktuUpload: new Date().toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      disetujui: true,
    };
    onUpdateState((prev) => ({
      ...prev,
      satkerBanners: [item, ...(prev.satkerBanners ?? [])],
    }));
    setNewBannerJudul('');
    setNewBannerImageUrl('');
    setNewBannerUcapan('');
    setNewBannerKet('');
    notify(`Spanduk / Foto untuk "${item.satker}" berhasil ditambahkan ke portal.`);
  };

  const handleUpdateSatkerBanner = (id: string, partial: Partial<SatkerBannerItem>) => {
    onUpdateState((prev) => {
      const current = prev.satkerBanners ?? [];
      return {
        ...prev,
        satkerBanners: current.map((b) => (b.id === id ? { ...b, ...partial } : b)),
      };
    });
  };

  const handleDeleteSatkerBanner = (id: string) => {
    onUpdateState((prev) => {
      const current = prev.satkerBanners ?? [];
      return {
        ...prev,
        satkerBanners: current.filter((b) => b.id !== id),
      };
    });
    notify('Spanduk / Foto Satker berhasil dihapus.');
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

  const videosList = appState.videos ?? [];
  const bannersList = appState.satkerBanners ?? [];

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
                Seluruh item dapat diubah (Edit) & dihapus (Hapus) kapan saja · Tersimpan otomatis & siap diekspor ke GitHub
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
            {isUnlocked && (
              <button
                type="button"
                onClick={() => {
                  setIsUnlocked(false);
                  setPinInput('');
                  onLockAdmin?.();
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-950/90 hover:bg-rose-900 border border-rose-500/50 text-rose-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                title="Kunci Kembali Mode Admin (Sembunyikan Fitur Admin & Tombol Suara)"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Kunci Mode Admin</span>
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
              <p className="text-xs text-slate-300">
                Masukkan Kode PIN Rahasia Panitia untuk mengelola Cabang Lomba, Jadwal Acara, Titik Koordinat Peta GPS Satelit, Satker, Galeri Video YouTube, serta Branding Resmi HAB ke-81.
              </p>
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
                autoComplete="off"
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

            <div className="pt-2 border-t border-emerald-800/70 w-full max-w-sm space-y-2">
              <p className="text-[11px] text-slate-400">
                Atau login langsung menggunakan Akun Google Firebase Admin Anda:
              </p>
              <button
                type="button"
                onClick={async () => {
                  setPinError(null);
                  const user = await signInWithGoogleAdmin();
                  if (user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
                    setIsUnlocked(true);
                  } else if (user) {
                    setPinError(
                      `Akun ${user.email} bukan email Admin utama (${ADMIN_EMAIL}). Silakan gunakan PIN.`
                    );
                  }
                }}
                className="w-full py-2.5 px-4 rounded-lg bg-emerald-800 hover:bg-emerald-700 border border-amber-400/50 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Cloud className="w-4 h-4" />
                <span>Login Google Admin ({ADMIN_EMAIL})</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* 5 Admin CRUD Tabs Navigation + Quick CSV Download for Admin */}
            <div
              role="tablist"
              aria-label="Tab Modul Admin"
              className="px-6 py-2.5 bg-[#02221a] border-b border-emerald-800 flex flex-wrap items-center justify-between gap-2 shrink-0"
            >
              <div className="flex flex-wrap items-center gap-2">
                {[
                  '1. Cabang Lomba, Skor & Medali (Edit/Hapus)',
                  '2. Jadwal, Titik Koordinat GPS & Baksos (Edit/Hapus)',
                  '3. Master Satker & Pendaftar (Edit/Hapus)',
                  '4. Video, Spanduk Satker, Kupon & Ucapan',
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

              <button
                type="button"
                data-testid="admin-header-download-registrations-csv"
                onClick={() => {
                  downloadRegistrationsCsvReport(
                    appState.registrations,
                    'Semua Cabang Lomba'
                  );
                  notify(
                    `File CSV Data Pendaftar (${appState.registrations.length} kontingen/peserta) berhasil diunduh!`
                  );
                }}
                className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 border border-amber-400/60 text-amber-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-sm"
                title="Unduh seluruh daftar pendaftar lomba dalam format CSV (Excel / Spreadsheet)"
              >
                <Download className="w-3.5 h-3.5 text-amber-300" />
                <span>Unduh Data Pendaftar (.CSV)</span>
              </button>
            </div>

            {/* Scrollable Tab Body */}
            <div className="p-6 overflow-y-auto space-y-8 flex-1">
              {/* ===================================================================
                  TAB 1: MASTER CABANG LOMBA, SKOR & KLASEMEN MEDALI (FULL EDIT/DELETE)
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
                      <select
                        aria-label="Kategori Lomba"
                        value={
                          newCompKategori.toLowerCase().includes('olahraga') ? 'Olahraga' : 'Lomba'
                        }
                        onChange={(e) => setNewCompKategori(e.target.value)}
                        className="px-3 py-2 rounded-lg bg-[#03251c] border border-emerald-700 text-xs text-white"
                      >
                        <option value="Olahraga">Kategori Olahraga</option>
                        <option value="Lomba">Kategori Lomba</option>
                      </select>
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

                    {/* Juknis Input Section for New Competition */}
                    <div className="pt-3 border-t border-emerald-800/70 space-y-3">
                      <div className="text-xs font-bold text-emerald-300">
                        Petunjuk Teknis (Juknis) Lomba / Olahraga Baru (Opsional — dapat diedit kapan saja):
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <label className="block text-[11px] text-slate-300">
                            1. Isi Aturan / Ketentuan Teknis Juknis (Tampil langsung saat peserta klik &ldquo;Lihat Juknis&rdquo;):
                          </label>
                          <textarea
                            rows={3}
                            value={newCompCatatan}
                            onChange={(e) => setNewCompCatatan(e.target.value)}
                            placeholder="Ketik poin-poin aturan lomba di sini... (Contoh: 1. Sistem gugur, 2. Kostum sopan/olahraga, 3. Hadir 30 menit sebelum jadwal)"
                            className="w-full px-3 py-2 rounded-lg bg-[#03251c] border border-emerald-700 text-xs text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[11px] text-slate-300">
                            2. Link Dokumen Juknis (Google Drive / PDF) atau Upload File PDF/Gambar Juknis (Maks 2MB):
                          </label>
                          <input
                            type="text"
                            value={newCompJuknis.startsWith('data:') ? 'File Juknis Lokal Terunggah' : newCompJuknis}
                            onChange={(e) => setNewCompJuknis(e.target.value)}
                            placeholder="Tempel link Google Drive / PDF Juknis (https://drive.google.com/...)"
                            className="w-full px-3 py-2 rounded-lg bg-[#03251c] border border-emerald-700 text-xs text-white"
                          />
                          <div className="flex flex-wrap items-center gap-2">
                            <label className="px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-emerald-100 text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer">
                              <Upload className="w-3.5 h-3.5" />
                              <span>Upload File PDF / Gambar Juknis</span>
                              <input
                                type="file"
                                accept=".pdf,image/*"
                                onChange={(e) => handleUploadJuknisFile(e)}
                                className="hidden"
                              />
                            </label>
                            {newCompJuknis && newCompJuknis !== '#juknis' && (
                              <button
                                type="button"
                                onClick={() => setNewCompJuknis('')}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-950/80 text-rose-300 text-[11px] cursor-pointer"
                              >
                                Reset File/Link
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </form>

                  {/* Existing Competitions List with Inline Edit & Delete */}
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold text-slate-200">
                      Daftar Master Cabang Lomba Aktif ({appState.competitions.length}) — Klik &ldquo;Edit&rdquo; untuk mengubah detail atau &ldquo;Hapus&rdquo;
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {appState.competitions.map((comp) => {
                        const isEditing = editingCompId === comp.id;
                        return (
                          <div
                            key={comp.id}
                            className="bg-[#021b15] border border-emerald-800/80 rounded-xl p-3.5 space-y-2.5"
                          >
                            <div className="flex items-center justify-between gap-3">
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
                                  onClick={() => {
                                    if (isEditing) {
                                      setEditingCompId(null);
                                      notify(`✓ Perubahan pada "${comp.nama}" berhasil disimpan!`);
                                    } else {
                                      setEditingCompId(comp.id);
                                    }
                                  }}
                                  className={`px-2.5 py-1 rounded border text-[11px] font-bold cursor-pointer ${
                                    isEditing
                                      ? 'bg-amber-400 text-slate-950 border-amber-300'
                                      : 'bg-[#03251c] hover:bg-emerald-900 border-emerald-700 text-amber-300'
                                  }`}
                                >
                                  {isEditing ? '✓ Simpan Perubahan' : 'Edit & Juknis'}
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

                            {isEditing && (
                              <div className="pt-3 border-t border-emerald-800/70 space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <input
                                    type="text"
                                    value={comp.nama}
                                    onChange={(e) =>
                                      handleUpdateCompetitionField(comp.id, { nama: e.target.value })
                                    }
                                    placeholder="Nama Lomba"
                                    className="px-2.5 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-xs text-white"
                                  />
                                  <select
                                    value={
                                      comp.kategori.toLowerCase().includes('olahraga')
                                        ? 'Olahraga'
                                        : 'Lomba'
                                    }
                                    onChange={(e) =>
                                      handleUpdateCompetitionField(comp.id, {
                                        kategori: e.target.value,
                                      })
                                    }
                                    className="px-2.5 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-xs text-white"
                                  >
                                    <option value="Olahraga">Kategori Olahraga</option>
                                    <option value="Lomba">Kategori Lomba</option>
                                  </select>
                                  <select
                                    value={comp.jenisPeserta}
                                    onChange={(e) =>
                                      handleUpdateCompetitionField(comp.id, {
                                        jenisPeserta: e.target.value as ParticipantFormat,
                                      })
                                    }
                                    className="px-2.5 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-xs text-white"
                                  >
                                    <option value="Perorangan/Individu">Perorangan/Individu</option>
                                    <option value="Ganda">Ganda</option>
                                    <option value="Beregu/Tim">Beregu/Tim</option>
                                  </select>
                                  <input
                                    type="number"
                                    min={1}
                                    max={30}
                                    value={comp.kuotaPemain}
                                    onChange={(e) =>
                                      handleUpdateCompetitionField(comp.id, {
                                        kuotaPemain: Math.max(1, Number(e.target.value) || 1),
                                      })
                                    }
                                    placeholder="Kuota Pemain"
                                    className="px-2.5 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-xs text-white"
                                  />
                                  <input
                                    type="text"
                                    value={comp.jadwalRingkas}
                                    onChange={(e) =>
                                      handleUpdateCompetitionField(comp.id, {
                                        jadwalRingkas: e.target.value,
                                      })
                                    }
                                    placeholder="Jadwal Ringkas"
                                    className="px-2.5 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-xs text-white"
                                  />
                                  <input
                                    type="text"
                                    value={comp.koordinator}
                                    onChange={(e) =>
                                      handleUpdateCompetitionField(comp.id, {
                                        koordinator: e.target.value,
                                      })
                                    }
                                    placeholder="PIC / Koordinator"
                                    className="px-2.5 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-xs text-white"
                                  />
                                </div>

                                {/* Juknis Editor Inside Competition Edit Box */}
                                <div className="p-3 rounded-lg bg-[#03251c]/90 border border-amber-400/40 space-y-2.5">
                                  <div className="text-[11px] font-bold text-amber-300">
                                    Kelola Petunjuk Teknis (Juknis) — {comp.nama}
                                  </div>
                                  <div className="space-y-1">
                                    <label className="block text-[11px] text-slate-300">
                                      Isi Ringkasan / Poin-Poin Aturan Juknis (Tampil di Popup &ldquo;Lihat Juknis&rdquo;):
                                    </label>
                                    <textarea
                                      rows={4}
                                      value={comp.catatan || ''}
                                      onChange={(e) =>
                                        handleUpdateCompetitionField(comp.id, {
                                          catatan: e.target.value,
                                        })
                                      }
                                      placeholder="Tulis aturan teknis lomba, syarat peserta, sistem pertandingan, pakaian, dll..."
                                      className="w-full px-2.5 py-1.5 rounded bg-[#021b15] border border-emerald-700 text-xs text-white"
                                    />
                                  </div>

                                  <div className="space-y-1.5">
                                    <label className="block text-[11px] text-slate-300">
                                      Link Dokumen Juknis (Google Drive / PDF) atau Upload File PDF/Gambar Juknis:
                                    </label>
                                    <input
                                      type="text"
                                      value={
                                        comp.juknisUrl?.startsWith('data:')
                                          ? 'File Juknis Lokal Terunggah (Siap Diunduh Peserta)'
                                          : comp.juknisUrl === '#juknis'
                                          ? ''
                                          : comp.juknisUrl
                                      }
                                      onChange={(e) =>
                                        handleUpdateCompetitionField(comp.id, {
                                          juknisUrl: e.target.value.trim() || '#juknis',
                                        })
                                      }
                                      placeholder="https://drive.google.com/file/d/... (Link PDF Juknis)"
                                      className="w-full px-2.5 py-1.5 rounded bg-[#021b15] border border-emerald-700 text-xs text-white"
                                    />
                                    <div className="flex flex-wrap items-center gap-2 pt-1">
                                      <label className="px-2.5 py-1.5 rounded bg-emerald-800 hover:bg-emerald-700 text-emerald-100 text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer">
                                        <Upload className="w-3.5 h-3.5" />
                                        <span>Upload File PDF / Gambar Juknis</span>
                                        <input
                                          type="file"
                                          accept=".pdf,image/*"
                                          onChange={(e) => handleUploadJuknisFile(e, comp.id)}
                                          className="hidden"
                                        />
                                      </label>
                                      {comp.juknisUrl && comp.juknisUrl !== '#juknis' && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleUpdateCompetitionField(comp.id, {
                                              juknisUrl: '#juknis',
                                            })
                                          }
                                          className="px-2.5 py-1 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 text-[11px] cursor-pointer"
                                        >
                                          Hapus File/Link Juknis
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quick Match Scoreboard & Medal Editor */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-emerald-800">
                    {/* Add & Edit/Delete Match Scores */}
                    <div className="bg-[#021b15] border border-emerald-800 rounded-xl p-4 space-y-4">
                      <form onSubmit={handleAddMatch} className="space-y-3">
                        <h4 className="text-xs font-bold text-amber-300">
                          + Tambah & Kelola Skor Pertandingan Live ({appState.matches.length})
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
                          + Simpan Pertandingan Baru
                        </button>
                      </form>

                      {/* Existing Matches Edit & Delete */}
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1 pt-2 border-t border-emerald-800/70">
                        {appState.matches.map((m) => (
                          <div
                            key={m.id}
                            className="bg-[#03251c] border border-emerald-800/60 rounded-lg p-2.5 space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <input
                                type="text"
                                value={m.competitionName}
                                onChange={(e) =>
                                  handleUpdateMatch(m.id, { competitionName: e.target.value })
                                }
                                className="px-2 py-0.5 rounded bg-[#021b15] border border-emerald-700 text-[11px] text-amber-300 font-bold w-36"
                              />
                              <select
                                value={m.status}
                                onChange={(e) =>
                                  handleUpdateMatch(m.id, {
                                    status: e.target.value as MatchScore['status'],
                                  })
                                }
                                className="px-2 py-0.5 rounded bg-[#021b15] border border-emerald-700 text-[11px] text-emerald-200"
                              >
                                <option value="Belum Mulai">Belum Mulai</option>
                                <option value="Sedang Berlangsung">Sedang Berlangsung</option>
                                <option value="Selesai">Selesai</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => handleDeleteMatch(m.id)}
                                className="p-1 rounded bg-rose-950 text-rose-300 hover:bg-rose-900 cursor-pointer"
                                title="Hapus Skor Pertandingan"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="grid grid-cols-12 gap-1.5 items-center">
                              <input
                                type="text"
                                value={m.kontingenA}
                                onChange={(e) =>
                                  handleUpdateMatch(m.id, { kontingenA: e.target.value })
                                }
                                className="col-span-4 px-2 py-1 rounded bg-[#021b15] border border-emerald-800 text-[11px] text-white"
                              />
                              <input
                                type="text"
                                value={m.skorA}
                                onChange={(e) =>
                                  handleUpdateMatch(m.id, { skorA: e.target.value })
                                }
                                className="col-span-2 px-1.5 py-1 rounded bg-[#021b15] border border-amber-400/50 text-center font-mono-tabular text-xs text-amber-300 font-bold"
                              />
                              <input
                                type="text"
                                value={m.skorB}
                                onChange={(e) =>
                                  handleUpdateMatch(m.id, { skorB: e.target.value })
                                }
                                className="col-span-2 px-1.5 py-1 rounded bg-[#021b15] border border-amber-400/50 text-center font-mono-tabular text-xs text-amber-300 font-bold"
                              />
                              <input
                                type="text"
                                value={m.kontingenB}
                                onChange={(e) =>
                                  handleUpdateMatch(m.id, { kontingenB: e.target.value })
                                }
                                className="col-span-4 px-2 py-1 rounded bg-[#021b15] border border-emerald-800 text-[11px] text-white"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Medal Standings Full Edit (+ / - / Add / Delete) */}
                    <div className="bg-[#021b15] border border-emerald-800 rounded-xl p-4 space-y-3">
                      <h4 className="text-xs font-bold text-amber-300">
                        Kelola Klasemen Medali Kontingen (Tambah / Kurangi / Hapus)
                      </h4>
                      <form onSubmit={handleAddMedalRow} className="flex gap-2">
                        <input
                          type="text"
                          value={newMedalSatker}
                          onChange={(e) => setNewMedalSatker(e.target.value)}
                          placeholder="Tambah Kontingen/Satker ke Klasemen..."
                          className="flex-1 px-3 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-xs text-white"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1.5 rounded bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                        >
                          + Kontingen
                        </button>
                      </form>
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {appState.medalStandings.map((m) => (
                          <div
                            key={m.id}
                            className="flex flex-wrap items-center justify-between gap-2 text-xs bg-[#03251c] px-3 py-2 rounded-lg"
                          >
                            <input
                              type="text"
                              value={m.satker}
                              onChange={(e) =>
                                onUpdateState((prev) => ({
                                  ...prev,
                                  medalStandings: prev.medalStandings.map((row) =>
                                    row.id === m.id ? { ...row, satker: e.target.value } : row
                                  ),
                                }))
                              }
                              className="bg-[#021b15] border border-emerald-800 rounded px-2 py-0.5 text-white font-medium text-xs w-40"
                            />
                            <div className="flex items-center gap-1.5 shrink-0 font-mono-tabular">
                              {/* Emas */}
                              <div className="flex items-center bg-amber-400/15 border border-amber-400/40 rounded px-1">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateMedal(m.id, 'emas', -1)}
                                  className="px-1 text-amber-300 hover:text-white cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="px-1 text-[11px] text-amber-300 font-bold">
                                  E:{m.emas}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateMedal(m.id, 'emas', 1)}
                                  className="px-1 text-amber-300 hover:text-white cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                              {/* Perak */}
                              <div className="flex items-center bg-slate-700/60 border border-slate-500/40 rounded px-1">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateMedal(m.id, 'perak', -1)}
                                  className="px-1 text-slate-200 hover:text-white cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="px-1 text-[11px] text-slate-200 font-bold">
                                  P:{m.perak}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateMedal(m.id, 'perak', 1)}
                                  className="px-1 text-slate-200 hover:text-white cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                              {/* Perunggu */}
                              <div className="flex items-center bg-amber-900/40 border border-amber-700/40 rounded px-1">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateMedal(m.id, 'perunggu', -1)}
                                  className="px-1 text-amber-400 hover:text-white cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="px-1 text-[11px] text-amber-400 font-bold">
                                  Pr:{m.perunggu}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateMedal(m.id, 'perunggu', 1)}
                                  className="px-1 text-amber-400 hover:text-white cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteMedalRow(m.id)}
                                className="p-1 rounded bg-rose-950 text-rose-300 hover:bg-rose-900 cursor-pointer"
                                title="Hapus Kontingen dari Klasemen"
                              >
                                <Trash2 className="w-3 h-3" />
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
                  TAB 2: JADWAL ACARA, PIN LOKASI PETA 3D & DAMPAK BAKTI SOSIAL (FULL EDIT/DELETE)
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

                  {/* Schedule Items List with Edit & Delete */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-200">
                      Daftar Jadwal Acara ({appState.schedules.length}) — Klik &ldquo;Edit&rdquo; untuk mengubah acara/tanggal/lokasi/PIC/status atau &ldquo;Hapus&rdquo;
                    </h4>
                    {appState.schedules.map((s) => {
                      const isEditing = editingSchId === s.id;
                      return (
                        <div
                          key={s.id}
                          className="bg-[#021b15] border border-emerald-800/70 rounded-lg p-3 space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <strong className="text-white">{s.judul}</strong>{' '}
                              <span className="text-amber-300">({s.kategori})</span> · {s.tanggal} ({s.waktu}) ·{' '}
                              <span className="text-emerald-300">{s.lokasiNama}</span> ·{' '}
                              <span className="text-slate-300">PIC: {s.pic}</span> ·{' '}
                              <span className="underline">{s.status}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  if (isEditing) {
                                    setEditingSchId(null);
                                    notify(`✓ Perubahan jadwal "${s.judul}" berhasil disimpan secara real-time!`);
                                  } else {
                                    setEditingSchId(s.id);
                                  }
                                }}
                                className={`px-2.5 py-1 rounded border text-[11px] font-bold cursor-pointer ${
                                  isEditing
                                    ? 'bg-amber-400 text-slate-950 border-amber-300'
                                    : 'bg-[#03251c] border-emerald-700 text-amber-300'
                                }`}
                              >
                                {isEditing ? '✓ Simpan Perubahan' : 'Edit'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  onUpdateState((prev) => ({
                                    ...prev,
                                    schedules: prev.schedules.filter((x) => x.id !== s.id),
                                  }));
                                  notify(`Agenda "${s.judul}" berhasil dihapus secara real-time.`);
                                }}
                                className="p-1.5 rounded bg-rose-950 text-rose-300 hover:bg-rose-900 cursor-pointer"
                                title="Hapus Jadwal Acara"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {isEditing && (
                            <div className="pt-2 border-t border-emerald-800/70 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                              <input
                                type="text"
                                value={s.judul}
                                onChange={(e) =>
                                  handleUpdateSchedule(s.id, { judul: e.target.value })
                                }
                                placeholder="Judul Acara"
                                className="sm:col-span-2 px-2.5 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-xs text-white"
                              />
                              <input
                                type="text"
                                value={s.kategori}
                                onChange={(e) =>
                                  handleUpdateSchedule(s.id, { kategori: e.target.value })
                                }
                                placeholder="Kategori (mis. Bakti Sosial)"
                                className="px-2.5 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-xs text-white"
                              />
                              <select
                                value={s.status}
                                onChange={(e) =>
                                  handleUpdateSchedule(s.id, {
                                    status: e.target.value as ScheduleStatus,
                                  })
                                }
                                className="px-2.5 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-xs text-white"
                              >
                                <option value="Terjadwal">Terjadwal</option>
                                <option value="Sedang Berlangsung">Sedang Berlangsung</option>
                                <option value="Ditunda/Pindah Lokasi">Ditunda/Pindah Lokasi</option>
                                <option value="Selesai">Selesai</option>
                              </select>
                              <input
                                type="date"
                                value={s.tanggal}
                                onChange={(e) =>
                                  handleUpdateSchedule(s.id, { tanggal: e.target.value })
                                }
                                className="px-2.5 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-xs text-white"
                              />
                              <input
                                type="text"
                                value={s.waktu}
                                onChange={(e) =>
                                  handleUpdateSchedule(s.id, { waktu: e.target.value })
                                }
                                placeholder="Waktu (08:00 - 11:00 WITA)"
                                className="px-2.5 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-xs text-white"
                              />
                              <select
                                value={s.lokasiId}
                                onChange={(e) => {
                                  const selectedVenue = appState.venues.find(
                                    (v) => v.id === e.target.value
                                  );
                                  handleUpdateSchedule(s.id, {
                                    lokasiId: e.target.value,
                                    lokasiNama: selectedVenue ? selectedVenue.nama : s.lokasiNama,
                                  });
                                }}
                                className="px-2.5 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-xs text-white"
                              >
                                {appState.venues.map((v) => (
                                  <option key={v.id} value={v.id}>
                                    Pin Peta: {v.nama}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="text"
                                value={s.lokasiNama}
                                onChange={(e) =>
                                  handleUpdateSchedule(s.id, { lokasiNama: e.target.value })
                                }
                                placeholder="Nama Lokasi Tampil"
                                className="px-2.5 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-xs text-emerald-200"
                              />
                              <input
                                type="text"
                                value={s.pic}
                                onChange={(e) =>
                                  handleUpdateSchedule(s.id, { pic: e.target.value })
                                }
                                placeholder="Koordinator / PIC"
                                className="px-2.5 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-xs text-white"
                              />
                              <input
                                type="text"
                                value={s.catatan || ''}
                                onChange={(e) =>
                                  handleUpdateSchedule(s.id, { catatan: e.target.value })
                                }
                                placeholder="Catatan Tambahan Acara (opsional)"
                                className="sm:col-span-2 lg:col-span-3 px-2.5 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-xs text-slate-200"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Add & Edit/Delete 3D Venue Pin & Baksos Tracker */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-emerald-800">
                    {/* Venues / GPS Checkpoints CRUD */}
                    <div className="bg-[#021b15] border border-emerald-800 rounded-xl p-4 space-y-4">
                      <form onSubmit={handleAddVenue} className="space-y-3">
                        <h4 className="text-xs font-bold text-amber-300">
                          + Tambah & Kelola Titik Koordinat Peta GPS Satelit ({appState.venues.length})
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={newVenueNama}
                            onChange={(e) => setNewVenueNama(e.target.value)}
                            placeholder="Nama Titik / Lokasi (mis. Start Jalan Santai) *"
                            className="col-span-2 px-3 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-xs text-white"
                          />
                          <input
                            type="text"
                            value={newVenueKategori}
                            onChange={(e) => setNewVenueKategori(e.target.value)}
                            placeholder="Kategori Titik (mis. Titik Start / Finish Jalan Santai)"
                            className="col-span-2 px-3 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-xs text-amber-200"
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
                            className="col-span-2 px-3 py-1.5 rounded bg-[#03251c] border border-amber-400/60 text-xs text-amber-300 font-mono-tabular"
                          />
                          <input
                            type="text"
                            value={newVenueAlamat}
                            onChange={(e) => setNewVenueAlamat(e.target.value)}
                            placeholder="Alamat / Patokan Lokasi"
                            className="px-3 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-xs text-white"
                          />
                          <input
                            type="text"
                            value={newVenueKapasitas}
                            onChange={(e) => setNewVenueKapasitas(e.target.value)}
                            placeholder="Waktu Kumpul / Kapasitas (mis. Start 06:30 WITA)"
                            className="px-3 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-xs text-white"
                          />
                          <input
                            type="text"
                            value={newVenueDeskripsi}
                            onChange={(e) => setNewVenueDeskripsi(e.target.value)}
                            placeholder="Deskripsi singkat kegiatan di titik ini"
                            className="col-span-2 px-3 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-xs text-white"
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs cursor-pointer"
                        >
                          + Tambahkan Titik Koordinat ke Peta GPS Satelit
                        </button>
                      </form>

                      {/* Existing Venues Edit/Delete */}
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1 pt-2 border-t border-emerald-800/70">
                        {appState.venues.map((v) => (
                          <div
                            key={v.id}
                            className="bg-[#03251c] border border-emerald-800/60 rounded-lg p-2.5 space-y-1.5 text-xs"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <input
                                type="text"
                                value={v.nama}
                                onChange={(e) => handleUpdateVenue(v.id, { nama: e.target.value })}
                                placeholder="Nama Titik Lokasi"
                                className="flex-1 px-2 py-1 rounded bg-[#021b15] border border-emerald-700 text-white font-bold text-xs"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  notify(`✓ Titik koordinat "${v.nama}" berhasil disimpan!`)
                                }
                                className="px-2.5 py-1 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[11px] flex items-center gap-1 cursor-pointer shrink-0"
                                title="Simpan Perubahan Titik Koordinat"
                              >
                                <Check className="w-3 h-3" />
                                <span>Simpan</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteVenue(v.id)}
                                className="p-1.5 rounded bg-rose-950 text-rose-300 hover:bg-rose-900 cursor-pointer"
                                title="Hapus Titik Koordinat"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              <input
                                type="text"
                                value={v.kategoriTitik || ''}
                                onChange={(e) =>
                                  handleUpdateVenue(v.id, { kategoriTitik: e.target.value })
                                }
                                placeholder="Kategori Titik (mis. Start Jalan Santai)"
                                className="px-2 py-1 rounded bg-[#021b15] border border-emerald-800 text-[11px] text-amber-200"
                              />
                              <input
                                type="text"
                                value={v.koordinatGps || `${v.latitude}, ${v.longitude}`}
                                onChange={(e) =>
                                  handleUpdateVenue(v.id, { koordinatGps: e.target.value })
                                }
                                placeholder="Lat, Lng GPS"
                                className="px-2 py-1 rounded bg-[#021b15] border border-amber-400/50 text-[11px] text-amber-300 font-mono-tabular"
                              />
                              <input
                                type="text"
                                value={v.alamat}
                                onChange={(e) =>
                                  handleUpdateVenue(v.id, { alamat: e.target.value })
                                }
                                placeholder="Alamat / Patokan"
                                className="px-2 py-1 rounded bg-[#021b15] border border-emerald-800 text-[11px] text-slate-200"
                              />
                              <input
                                type="text"
                                value={v.kapasitas}
                                onChange={(e) =>
                                  handleUpdateVenue(v.id, { kapasitas: e.target.value })
                                }
                                placeholder="Waktu Kumpul / Kapasitas"
                                className="px-2 py-1 rounded bg-[#021b15] border border-emerald-800 text-[11px] text-slate-200"
                              />
                              <input
                                type="text"
                                value={v.deskripsi}
                                onChange={(e) =>
                                  handleUpdateVenue(v.id, { deskripsi: e.target.value })
                                }
                                placeholder="Deskripsi kegiatan"
                                className="col-span-2 px-2 py-1 rounded bg-[#021b15] border border-emerald-800 text-[11px] text-slate-300"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Baksos CRUD */}
                    <div className="bg-[#021b15] border border-emerald-800 rounded-xl p-4 space-y-4">
                      <form onSubmit={handleAddBaksos} className="space-y-3">
                        <h4 className="text-xs font-bold text-amber-300">
                          + Tambah & Kelola Indikator Dampak Bakti Sosial ({appState.baksosMetrics.length})
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
                          + Tambahkan Indikator Bakti Sosial
                        </button>
                      </form>

                      {/* Existing Baksos Edit/Delete */}
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1 pt-2 border-t border-emerald-800/70">
                        {appState.baksosMetrics.length > 0 && (
                          <div className="flex items-center justify-between gap-2 pb-1">
                            <span className="text-[11px] text-slate-300 font-semibold">
                              Daftar Aktif ({appState.baksosMetrics.length} Program):
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                onUpdateState((prev) => ({
                                  ...prev,
                                  baksosMetrics: [],
                                }));
                                notify(
                                  '✓ Seluruh indikator Bakti Sosial berhasil dikosongkan secara permanen & disinkronkan ke Cloud!'
                                );
                              }}
                              className="px-2.5 py-1 rounded bg-rose-950/90 hover:bg-rose-900 border border-rose-500/50 text-rose-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Hapus Semua Baksos</span>
                            </button>
                          </div>
                        )}
                        {appState.baksosMetrics.length === 0 && (
                          <div className="text-center text-[11px] text-slate-400 py-3">
                            Daftar indikator Bakti Sosial saat ini kosong.
                          </div>
                        )}
                        {appState.baksosMetrics.map((b) => (
                          <div
                            key={b.id}
                            className="bg-[#03251c] border border-emerald-800/60 rounded-lg p-2.5 space-y-1.5 text-xs"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <input
                                type="text"
                                value={b.namaProgram}
                                onChange={(e) =>
                                  handleUpdateBaksos(b.id, { namaProgram: e.target.value })
                                }
                                placeholder="Nama Program Bakti Sosial"
                                className="flex-1 px-2 py-1 rounded bg-[#021b15] border border-emerald-700 text-white font-bold text-xs"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  notify(
                                    `✓ Indikator Baksos "${b.namaProgram}" berhasil disimpan secara real-time!`
                                  )
                                }
                                className="px-2.5 py-1 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[11px] flex items-center gap-1 cursor-pointer shrink-0"
                                title="Simpan Perubahan Indikator Baksos"
                              >
                                <Check className="w-3 h-3" />
                                <span>Simpan</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteBaksos(b.id)}
                                className="p-1.5 rounded bg-rose-950 text-rose-300 hover:bg-rose-900 cursor-pointer"
                                title="Hapus Program Baksos"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5 items-center">
                              <div>
                                <span className="text-[10px] text-slate-400 block">Capaian</span>
                                <input
                                  type="number"
                                  value={b.capaian}
                                  onChange={(e) =>
                                    handleUpdateBaksos(b.id, {
                                      capaian: Math.max(0, Number(e.target.value) || 0),
                                    })
                                  }
                                  className="w-full px-2 py-1 rounded bg-[#021b15] border border-emerald-800 text-amber-300 font-mono-tabular text-xs"
                                />
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 block">Target</span>
                                <input
                                  type="number"
                                  value={b.target}
                                  onChange={(e) =>
                                    handleUpdateBaksos(b.id, {
                                      target: Math.max(1, Number(e.target.value) || 1),
                                    })
                                  }
                                  className="w-full px-2 py-1 rounded bg-[#021b15] border border-emerald-800 text-white font-mono-tabular text-xs"
                                />
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 block">Satuan</span>
                                <input
                                  type="text"
                                  value={b.satuan}
                                  onChange={(e) =>
                                    handleUpdateBaksos(b.id, { satuan: e.target.value })
                                  }
                                  className="w-full px-2 py-1 rounded bg-[#021b15] border border-emerald-800 text-slate-200 text-xs"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5 pt-1">
                              <input
                                type="text"
                                value={b.lokasi || ''}
                                onChange={(e) =>
                                  handleUpdateBaksos(b.id, { lokasi: e.target.value })
                                }
                                placeholder="Lokasi Pelaksanaan Baksos"
                                className="px-2 py-1 rounded bg-[#021b15] border border-emerald-800 text-[11px] text-slate-300"
                              />
                              <input
                                type="text"
                                value={b.koordinator || ''}
                                onChange={(e) =>
                                  handleUpdateBaksos(b.id, { koordinator: e.target.value })
                                }
                                placeholder="Koordinator / Seksi"
                                className="px-2 py-1 rounded bg-[#021b15] border border-emerald-800 text-[11px] text-slate-300"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ===================================================================
                  TAB 3: MASTER SATKER / KONTINGEN & DATA PENDAFTAR LOMBA (FULL EDIT/DELETE)
                 =================================================================== */}
              {activeTab === 2 && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Satker CRUD (Add, Edit/Rename, Delete) */}
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
                    <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                      {appState.satkerList.map((s, idx) => (
                        <div
                          key={`${s}-${idx}`}
                          className="flex items-center justify-between gap-2 bg-[#03251c] px-3 py-1.5 rounded-lg text-xs text-slate-200"
                        >
                          {editingSatkerIdx === idx ? (
                            <div className="flex items-center gap-1.5 flex-1">
                              <input
                                type="text"
                                value={editingSatkerValue}
                                onChange={(e) => setEditingSatkerValue(e.target.value)}
                                className="flex-1 px-2 py-1 rounded bg-[#021b15] border border-amber-400 text-xs text-white"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveRenameSatker(idx)}
                                className="px-2 py-1 rounded bg-emerald-700 text-white text-[11px] font-bold cursor-pointer"
                              >
                                Simpan
                              </button>
                            </div>
                          ) : (
                            <span className="truncate flex-1">{s}</span>
                          )}
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                if (editingSatkerIdx === idx) {
                                  setEditingSatkerIdx(null);
                                } else {
                                  setEditingSatkerIdx(idx);
                                  setEditingSatkerValue(s);
                                }
                              }}
                              className="text-amber-300 hover:text-amber-200 cursor-pointer"
                            >
                              {editingSatkerIdx === idx ? 'Batal' : 'Edit'}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateState((prev) => ({
                                  ...prev,
                                  satkerList: prev.satkerList.filter((_, i) => i !== idx),
                                }))
                              }
                              className="text-rose-400 hover:text-rose-300 cursor-pointer"
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Registered Teams Management (Edit, Delete & Official PDF Report) */}
                  <div className="lg:col-span-7 bg-[#021b15] border border-emerald-800 rounded-xl p-4 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-800/80 pb-3">
                      <h3 className="text-sm font-bold text-amber-300">
                        Data Kontingen & Peserta Lomba Terdaftar ({appState.registrations.length})
                      </h3>

                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          aria-label="Filter Cabang Lomba untuk Laporan PDF"
                          value={regPdfFilter}
                          onChange={(e) => setRegPdfFilter(e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#03251c] border border-emerald-700 text-xs text-white"
                        >
                          <option value="ALL">Semua Cabang Lomba ({appState.registrations.length})</option>
                          {appState.competitions.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nama}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          data-testid="admin-tab-download-registrations-csv"
                          onClick={() => {
                            const filtered =
                              regPdfFilter === 'ALL'
                                ? appState.registrations
                                : appState.registrations.filter(
                                    (r) => r.competitionId === regPdfFilter
                                  );
                            const label =
                              regPdfFilter === 'ALL'
                                ? 'Semua Cabang Lomba'
                                : appState.competitions.find((c) => c.id === regPdfFilter)?.nama ||
                                  'Cabang Terpilih';
                            downloadRegistrationsCsvReport(filtered, label);
                            notify(`Data Pendaftar CSV (${label}) berhasil diunduh!`);
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 border border-amber-400/50 text-amber-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                          title="Unduh Daftar Pendaftar dalam format CSV untuk Excel / Google Sheets"
                        >
                          <Download className="w-3.5 h-3.5 text-amber-300" />
                          <span>Unduh Data Pendaftar (.CSV)</span>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const filtered =
                              regPdfFilter === 'ALL'
                                ? appState.registrations
                                : appState.registrations.filter(
                                     (r) => r.competitionId === regPdfFilter
                                  );
                            const label =
                              regPdfFilter === 'ALL'
                                ? 'Semua Cabang Lomba'
                                : appState.competitions.find((c) => c.id === regPdfFilter)?.nama ||
                                  'Cabang Terpilih';
                            await downloadRegistrationsPdfReport(
                              filtered,
                              appState.branding,
                              label
                            );
                            notify(`Laporan PDF Peserta Lomba (${label}) berhasil diunduh!`);
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Unduh Laporan Peserta (.PDF)</span>
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                      {appState.registrations.map((reg) => {
                        const isEditing = editingRegId === reg.id;
                        return (
                          <div
                            key={reg.id}
                            className="bg-[#03251c] border border-emerald-800/70 rounded-lg p-3 space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between gap-3">
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
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isEditing) {
                                      setEditingRegId(null);
                                      notify(
                                        `✓ Perubahan data pendaftar "${reg.namaTimAtauPeserta}" berhasil disimpan!`
                                      );
                                    } else {
                                      setEditingRegId(reg.id);
                                    }
                                  }}
                                  className={`px-2.5 py-1 rounded border text-[11px] font-bold cursor-pointer ${
                                    isEditing
                                      ? 'bg-amber-400 text-slate-950 border-amber-300'
                                      : 'bg-[#021b15] border-emerald-700 text-amber-300'
                                  }`}
                                >
                                  {isEditing ? '✓ Simpan Perubahan' : 'Edit'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    onUpdateState((prev) => ({
                                      ...prev,
                                      registrations: prev.registrations.filter(
                                        (r) => r.id !== reg.id
                                      ),
                                    }))
                                  }
                                  className="p-1.5 rounded bg-rose-950 text-rose-300 cursor-pointer shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {isEditing && (
                              <div className="pt-2 border-t border-emerald-800/70 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  value={reg.namaTimAtauPeserta}
                                  onChange={(e) =>
                                    onUpdateState((prev) => ({
                                      ...prev,
                                      registrations: prev.registrations.map((r) =>
                                        r.id === reg.id
                                          ? { ...r, namaTimAtauPeserta: e.target.value }
                                          : r
                                      ),
                                    }))
                                  }
                                  placeholder="Nama Tim / Peserta"
                                  className="px-2.5 py-1.5 rounded bg-[#021b15] border border-emerald-700 text-xs text-white"
                                />
                                <input
                                  type="text"
                                  value={reg.satker}
                                  onChange={(e) =>
                                    onUpdateState((prev) => ({
                                      ...prev,
                                      registrations: prev.registrations.map((r) =>
                                        r.id === reg.id ? { ...r, satker: e.target.value } : r
                                      ),
                                    }))
                                  }
                                  placeholder="Asal Satker"
                                  className="px-2.5 py-1.5 rounded bg-[#021b15] border border-emerald-700 text-xs text-white"
                                />
                                <input
                                  type="text"
                                  value={reg.kontakWhatsapp}
                                  onChange={(e) =>
                                    onUpdateState((prev) => ({
                                      ...prev,
                                      registrations: prev.registrations.map((r) =>
                                        r.id === reg.id
                                          ? { ...r, kontakWhatsapp: e.target.value }
                                          : r
                                      ),
                                    }))
                                  }
                                  placeholder="No. WhatsApp"
                                  className="px-2.5 py-1.5 rounded bg-[#021b15] border border-emerald-700 text-xs text-white"
                                />
                                <input
                                  type="text"
                                  value={reg.daftarPemain.join(', ')}
                                  onChange={(e) =>
                                    onUpdateState((prev) => ({
                                      ...prev,
                                      registrations: prev.registrations.map((r) =>
                                        r.id === reg.id
                                          ? {
                                              ...r,
                                              daftarPemain: e.target.value
                                                .split(',')
                                                .map((x) => x.trim())
                                                .filter(Boolean),
                                            }
                                          : r
                                      ),
                                    }))
                                  }
                                  placeholder="Daftar Pemain (pisahkan koma)"
                                  className="px-2.5 py-1.5 rounded bg-[#021b15] border border-emerald-700 text-xs text-white"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ===================================================================
                  TAB 4: GALERI VIDEO YOUTUBE, KUPON JALAN SEHAT & MODERASI UCAPAN
                 =================================================================== */}
              {activeTab === 3 && (
                <div className="space-y-6">
                  {/* Video & YouTube Gallery Admin CRUD */}
                  <div className="bg-[#021b15] border border-emerald-800 rounded-xl p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                        <Video className="w-4 h-4" />
                        <span>
                          Kelola Galeri Video, Upload File MP4 (Khusus Admin) & Link YouTube ({videosList.length})
                        </span>
                      </h3>
                      <span className="text-[11px] text-emerald-300">
                        Pengguna publik hanya dapat mengirim Link YouTube · Upload File MP4 hanya tersedia di Panel Admin ini
                      </span>
                    </div>

                    <form onSubmit={handleAddVideoAdmin} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <input
                        type="text"
                        value={newVidJudul}
                        onChange={(e) => setNewVidJudul(e.target.value)}
                        placeholder="Judul Video / Live Streaming *"
                        className="px-3 py-2 rounded-lg bg-[#03251c] border border-emerald-700 text-xs text-white"
                      />
                      <select
                        value={newVidKat}
                        onChange={(e) => setNewVidKat(e.target.value)}
                        className="px-3 py-2 rounded-lg bg-[#03251c] border border-emerald-700 text-xs text-white"
                      >
                        <option value="Live Streaming & Upacara">Live Streaming & Upacara</option>
                        <option value="Lomba Video Kreatif & Moderasi">Lomba Video Kreatif & Moderasi</option>
                        <option value="Profil & Inovasi Satker">Profil & Inovasi Satker</option>
                        <option value="Dokumentasi Porseni & Baksos">Dokumentasi Porseni & Baksos</option>
                      </select>
                      <select
                        value={newVidSatker}
                        onChange={(e) => setNewVidSatker(e.target.value)}
                        className="px-3 py-2 rounded-lg bg-[#03251c] border border-emerald-700 text-xs text-white"
                      >
                        {appState.satkerList.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={newVidUrl}
                          onChange={(e) => setNewVidUrl(e.target.value)}
                          placeholder="Link YouTube atau URL .MP4 *"
                          className="flex-1 px-3 py-2 rounded-lg bg-[#03251c] border border-emerald-700 text-xs text-amber-200 font-mono-tabular min-w-0"
                        />
                        <label
                          title="Unggah File Video MP4/WebM dari Komputer/HP Admin"
                          className="px-2.5 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-700 border border-amber-400/50 text-amber-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>File MP4</span>
                          <input
                            type="file"
                            accept="video/mp4,video/webm"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const maxBytes = 4 * 1024 * 1024;
                              if (file.size > maxBytes) {
                                notify(
                                  `Ukuran file (${(file.size / (1024 * 1024)).toFixed(1)} MB) melebihi batas memori lokal browser (4 MB). Gunakan file MP4 pendek ≤ 4 MB atau masukkan URL file MP4.`
                                );
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = () => {
                                if (typeof reader.result === 'string') {
                                  setNewVidUrl(reader.result);
                                  if (!newVidJudul.trim()) {
                                    setNewVidJudul(file.name.replace(/\.[^/.]+$/, ''));
                                  }
                                  notify(`File video "${file.name}" siap disimpan oleh Admin.`);
                                }
                              };
                              reader.readAsDataURL(file);
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                      <input
                        type="text"
                        value={newVidDesc}
                        onChange={(e) => setNewVidDesc(e.target.value)}
                        placeholder="Deskripsi singkat video..."
                        className="sm:col-span-3 px-3 py-2 rounded-lg bg-[#03251c] border border-emerald-700 text-xs text-white"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Simpan Video (Admin)</span>
                      </button>
                    </form>

                    {/* Video Items List with Edit, Toggle & Delete */}
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {videosList.map((vid) => {
                        const isEditing = editingVidId === vid.id;
                        const currentUrl = vid.youtubeUrl || vid.videoFileUrl || '';
                        return (
                          <div
                            key={vid.id}
                            className="bg-[#03251c] border border-emerald-800/70 rounded-lg p-3 space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-bold text-white truncate">
                                  {vid.judul}{' '}
                                  <span className="text-amber-300">({vid.kategori})</span>
                                </div>
                                <div className="text-[11px] text-slate-400 truncate">
                                  {vid.satker} · {vid.sumberipe === 'youtube' ? 'YouTube' : 'MP4'} ·{' '}
                                  <span className="font-mono-tabular text-emerald-300">
                                    {currentUrl.slice(0, 60)}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateVideo(vid.id, { disetujui: !vid.disetujui })
                                  }
                                  className={`px-2 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                                    vid.disetujui
                                      ? 'bg-emerald-800 text-emerald-200'
                                      : 'bg-slate-800 text-slate-400'
                                  }`}
                                >
                                  {vid.disetujui ? 'Tampil' : 'Tersembunyi'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isEditing) {
                                      setEditingVidId(null);
                                      notify(`✓ Perubahan video "${vid.judul}" berhasil disimpan!`);
                                    } else {
                                      setEditingVidId(vid.id);
                                    }
                                  }}
                                  className={`px-2.5 py-1 rounded border text-[11px] font-bold cursor-pointer ${
                                    isEditing
                                      ? 'bg-amber-400 text-slate-950 border-amber-300'
                                      : 'bg-[#021b15] border-emerald-700 text-amber-300'
                                  }`}
                                >
                                  {isEditing ? '✓ Simpan Perubahan' : 'Edit'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteVideo(vid.id)}
                                  className="p-1.5 rounded bg-rose-950 text-rose-300 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {isEditing && (
                              <div className="pt-2 border-t border-emerald-800/70 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                                <input
                                  type="text"
                                  value={vid.judul}
                                  onChange={(e) =>
                                    handleUpdateVideo(vid.id, { judul: e.target.value })
                                  }
                                  placeholder="Judul Video"
                                  className="px-2.5 py-1.5 rounded bg-[#021b15] border border-emerald-700 text-xs text-white"
                                />
                                <input
                                  type="text"
                                  value={vid.satker}
                                  onChange={(e) =>
                                    handleUpdateVideo(vid.id, { satker: e.target.value })
                                  }
                                  placeholder="Satker"
                                  className="px-2.5 py-1.5 rounded bg-[#021b15] border border-emerald-700 text-xs text-white"
                                />
                                <input
                                  type="text"
                                  value={currentUrl}
                                  onChange={(e) =>
                                    handleUpdateVideo(vid.id, { youtubeUrl: e.target.value })
                                  }
                                  placeholder="Link YouTube / URL Video"
                                  className="sm:col-span-2 px-2.5 py-1.5 rounded bg-[#021b15] border border-emerald-700 text-xs text-amber-300 font-mono-tabular"
                                />
                                <input
                                  type="text"
                                  value={vid.deskripsi || ''}
                                  onChange={(e) =>
                                    handleUpdateVideo(vid.id, { deskripsi: e.target.value })
                                  }
                                  placeholder="Deskripsi Video"
                                  className="sm:col-span-4 px-2.5 py-1.5 rounded bg-[#021b15] border border-emerald-700 text-xs text-slate-200"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Satker Banner, Spanduk Ucapan & Activity Photos Admin CRUD */}
                  <div className="bg-[#021b15] border border-amber-400/50 rounded-xl p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-amber-300">
                        Kelola Spanduk, Banner Ucapan & Foto Kegiatan Satker ({bannersList.length})
                      </h3>
                      <span className="text-[11px] text-emerald-300">
                        Unggah file gambar spanduk (kompresi otomatis) atau masukkan Link URL gambar untuk setiap Satker · State bannerUcapan opsional
                      </span>
                    </div>

                    <form
                      onSubmit={handleAddSatkerBannerAdmin}
                      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
                    >
                      <select
                        value={newBannerSatker}
                        onChange={(e) => setNewBannerSatker(e.target.value)}
                        className="px-3 py-2 rounded-lg bg-[#03251c] border border-emerald-700 text-xs text-white"
                      >
                        {appState.satkerList.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>

                      <select
                        value={newBannerKat}
                        onChange={(e) => setNewBannerKat(e.target.value as SatkerBannerCategory)}
                        className="px-3 py-2 rounded-lg bg-[#03251c] border border-emerald-700 text-xs text-white"
                      >
                        <option value="Spanduk & Banner Ucapan">Spanduk & Banner Ucapan</option>
                        <option value="Persiapan Lomba">Persiapan Lomba</option>
                        <option value="Baksos">Baksos</option>
                        <option value="Kunjungan Kerja">Kunjungan Kerja</option>
                        <option value="Upacara & Seremonial">Upacara & Seremonial</option>
                      </select>

                      <input
                        type="text"
                        value={newBannerJudul}
                        onChange={(e) => setNewBannerJudul(e.target.value)}
                        placeholder="Judul Spanduk / Foto Kegiatan *"
                        className="sm:col-span-2 px-3 py-2 rounded-lg bg-[#03251c] border border-emerald-700 text-xs text-white"
                      />

                      <div className="sm:col-span-2 flex gap-1.5">
                        <input
                          type="text"
                          value={
                            newBannerImageUrl.startsWith('data:')
                              ? 'File Gambar Terkompresi Siap Disimpan'
                              : newBannerImageUrl
                          }
                          onChange={(e) => setNewBannerImageUrl(e.target.value)}
                          placeholder="Masukkan Link URL Gambar / Google Drive *"
                          className="flex-1 px-3 py-2 rounded-lg bg-[#03251c] border border-emerald-700 text-xs text-amber-200 font-mono-tabular min-w-0"
                        />
                        <label
                          title="Unggah File Gambar Spanduk / Foto (Otomatis Dikompresi)"
                          className="px-3 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-700 border border-amber-400/50 text-amber-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Gambar</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              try {
                                const { dataUrl, sizeKb } = await compressBannerImageFile(
                                  file,
                                  1280,
                                  0.78
                                );
                                setNewBannerImageUrl(dataUrl);
                                if (!newBannerJudul.trim()) {
                                  setNewBannerJudul(
                                    file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
                                  );
                                }
                                notify(
                                  `Gambar spanduk "${file.name}" berhasil dikompresi (~${sizeKb} KB) & siap disimpan.`
                                );
                              } catch {
                                notify('Gagal membaca file gambar.');
                              }
                              e.target.value = '';
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>

                      <input
                        type="text"
                        value={newBannerUcapan}
                        onChange={(e) => setNewBannerUcapan(e.target.value)}
                        placeholder="Teks bannerUcapan Satker (Opsional — mis. Dirgahayu HAB ke-81...)"
                        className="sm:col-span-2 px-3 py-2 rounded-lg bg-[#03251c] border border-emerald-700 text-xs text-white"
                      />

                      <input
                        type="text"
                        value={newBannerKet}
                        onChange={(e) => setNewBannerKet(e.target.value)}
                        placeholder="Keterangan tambahan lokasi / kegiatan (Opsional)"
                        className="sm:col-span-3 px-3 py-2 rounded-lg bg-[#03251c] border border-emerald-700 text-xs text-white"
                      />

                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Simpan Spanduk Satker</span>
                      </button>
                    </form>

                    {/* Existing Satker Banners List with Inline Edit & Delete */}
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {bannersList.map((bnr) => {
                        const isEditing = editingBannerId === bnr.id;
                        return (
                          <div
                            key={bnr.id}
                            className="bg-[#03251c] border border-emerald-800/70 rounded-lg p-3 space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <img
                                  src={normalizeBannerImageUrl(bnr.imageUrl)}
                                  alt={bnr.judul}
                                  referrerPolicy="no-referrer"
                                  className="w-16 h-10 object-cover rounded border border-emerald-700 bg-[#021b15] shrink-0"
                                />
                                <div className="min-w-0">
                                  <div className="font-bold text-white truncate">
                                    {bnr.judul}{' '}
                                    <span className="text-amber-300">({bnr.kategori})</span>
                                  </div>
                                  <div className="text-[11px] text-slate-300 truncate">
                                    {bnr.satker}
                                    {bnr.bannerUcapan ? ` · "${bnr.bannerUcapan}"` : ''}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isEditing) {
                                      setEditingBannerId(null);
                                      notify(
                                        `✓ Perubahan spanduk "${bnr.judul}" berhasil disimpan!`
                                      );
                                    } else {
                                      setEditingBannerId(bnr.id);
                                    }
                                  }}
                                  className={`px-2.5 py-1 rounded border text-[11px] font-bold cursor-pointer ${
                                    isEditing
                                      ? 'bg-amber-400 text-slate-950 border-amber-300'
                                      : 'bg-[#021b15] border-emerald-700 text-amber-300'
                                  }`}
                                >
                                  {isEditing ? '✓ Simpan Perubahan' : 'Edit'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSatkerBanner(bnr.id)}
                                  className="p-1.5 rounded bg-rose-950 text-rose-300 hover:bg-rose-900 cursor-pointer"
                                  title="Hapus Spanduk Satker"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {isEditing && (
                              <div className="pt-2 border-t border-emerald-800/70 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                                <select
                                  value={bnr.satker}
                                  onChange={(e) =>
                                    handleUpdateSatkerBanner(bnr.id, { satker: e.target.value })
                                  }
                                  className="px-2.5 py-1.5 rounded bg-[#021b15] border border-emerald-700 text-xs text-white"
                                >
                                  {appState.satkerList.map((s) => (
                                    <option key={s} value={s}>
                                      {s}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  value={bnr.kategori}
                                  onChange={(e) =>
                                    handleUpdateSatkerBanner(bnr.id, {
                                      kategori: e.target.value as SatkerBannerCategory,
                                    })
                                  }
                                  className="px-2.5 py-1.5 rounded bg-[#021b15] border border-emerald-700 text-xs text-white"
                                >
                                  <option value="Spanduk & Banner Ucapan">
                                    Spanduk & Banner Ucapan
                                  </option>
                                  <option value="Persiapan Lomba">Persiapan Lomba</option>
                                  <option value="Baksos">Baksos</option>
                                  <option value="Kunjungan Kerja">Kunjungan Kerja</option>
                                  <option value="Upacara & Seremonial">Upacara & Seremonial</option>
                                </select>
                                <input
                                  type="text"
                                  value={bnr.judul}
                                  onChange={(e) =>
                                    handleUpdateSatkerBanner(bnr.id, { judul: e.target.value })
                                  }
                                  placeholder="Judul Spanduk / Foto"
                                  className="sm:col-span-2 px-2.5 py-1.5 rounded bg-[#021b15] border border-emerald-700 text-xs text-white"
                                />
                                <div className="sm:col-span-2 flex gap-1.5">
                                  <input
                                    type="text"
                                    value={
                                      bnr.imageUrl.startsWith('data:')
                                        ? 'Gambar Terkompresi Tersimpan'
                                        : bnr.imageUrl
                                    }
                                    onChange={(e) =>
                                      handleUpdateSatkerBanner(bnr.id, {
                                        imageUrl: normalizeBannerImageUrl(e.target.value),
                                      })
                                    }
                                    placeholder="Link URL Gambar Spanduk"
                                    className="flex-1 px-2.5 py-1.5 rounded bg-[#021b15] border border-emerald-700 text-xs text-amber-300 font-mono-tabular"
                                  />
                                  <label className="px-2.5 py-1.5 rounded bg-emerald-800 hover:bg-emerald-700 text-emerald-100 text-[11px] font-semibold flex items-center gap-1 cursor-pointer shrink-0">
                                    <Upload className="w-3.5 h-3.5" />
                                    <span>Ganti File</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const { dataUrl } = await compressBannerImageFile(
                                          file,
                                          1280,
                                          0.78
                                        );
                                        handleUpdateSatkerBanner(bnr.id, { imageUrl: dataUrl });
                                        notify('Gambar spanduk berhasil diperbarui.');
                                        e.target.value = '';
                                      }}
                                      className="hidden"
                                    />
                                  </label>
                                </div>
                                <input
                                  type="text"
                                  value={bnr.bannerUcapan || ''}
                                  onChange={(e) =>
                                    handleUpdateSatkerBanner(bnr.id, {
                                      bannerUcapan: e.target.value || undefined,
                                    })
                                  }
                                  placeholder="Teks bannerUcapan Satker (Opsional)"
                                  className="sm:col-span-2 px-2.5 py-1.5 rounded bg-[#021b15] border border-emerald-700 text-xs text-white"
                                />
                                <input
                                  type="text"
                                  value={bnr.keterangan || ''}
                                  onChange={(e) =>
                                    handleUpdateSatkerBanner(bnr.id, {
                                      keterangan: e.target.value || undefined,
                                    })
                                  }
                                  placeholder="Keterangan Kegiatan (Opsional)"
                                  className="sm:col-span-4 px-2.5 py-1.5 rounded bg-[#021b15] border border-emerald-700 text-xs text-slate-200"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Coupons & Harmony Messages */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-[#021b15] border border-emerald-800 rounded-xl p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
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

                      {/* FITUR KUNCI ON/OFF PENDAFTARAN KUPON (ADMIN TOGGLE) */}
                      <div className="bg-[#03251c] border-2 border-amber-400/50 rounded-xl p-3.5 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-3 h-3 rounded-full ${
                                appState.branding.isCouponRegistrationOpen !== false
                                  ? 'bg-emerald-400 animate-pulse'
                                  : 'bg-rose-500'
                              }`}
                            />
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                <span>Kunci Pendaftaran Kupon Jalan Sehat:</span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[11px] font-extrabold uppercase ${
                                    appState.branding.isCouponRegistrationOpen !== false
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                  }`}
                                >
                                  {appState.branding.isCouponRegistrationOpen !== false
                                    ? '✓ DIBUKA (ON)'
                                    : '🔒 DITUTUP (OFF)'}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-300 mt-0.5">
                                {appState.branding.isCouponRegistrationOpen !== false
                                  ? 'Masyarakat/pegawai bebas mendaftar kupon QR digital baru.'
                                  : 'Formulir kupon dikunci dari publik. Peserta tidak dapat mendaftar baru.'}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const nextStatus = !(appState.branding.isCouponRegistrationOpen !== false);
                              onUpdateState((prev) => ({
                                ...prev,
                                branding: {
                                  ...prev.branding,
                                  isCouponRegistrationOpen: nextStatus,
                                },
                              }));
                              notify(
                                nextStatus
                                  ? 'Pendaftaran Kupon Jalan Sehat berhasil DIBUKA (ON) untuk publik.'
                                  : 'Pendaftaran Kupon Jalan Sehat berhasil DIKUNCI / DITUTUP (OFF).'
                              );
                            }}
                            className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all ${
                              appState.branding.isCouponRegistrationOpen !== false
                                ? 'bg-rose-600 hover:bg-rose-500 text-white border border-rose-400/50'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/50'
                            }`}
                          >
                            <span>
                              {appState.branding.isCouponRegistrationOpen !== false
                                ? '🔒 Kunci / Tutup Pendaftaran (OFF)'
                                : '🔓 Buka Pendaftaran Kupon (ON)'}
                            </span>
                          </button>
                        </div>

                        {/* Input Keterangan Alasan / Jadwal Saat Kupon Ditutup */}
                        {appState.branding.isCouponRegistrationOpen === false && (
                          <div className="pt-2 border-t border-emerald-800/80">
                            <label className="block text-[11px] font-semibold text-amber-300 mb-1">
                              Pemberitahuan Penutupan untuk Pengguna di Web:
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={
                                  appState.branding.couponRegistrationClosedMessage ||
                                  'Pendaftaran kupon undian Jalan Sehat Kerukunan saat ini sedang ditutup sementara oleh Panitia. Nantikan pembukaan sesi pendaftaran berikutnya atau hubungi Panitia HAB ke-81.'
                                }
                                onChange={(e) => {
                                  const val = e.target.value;
                                  onUpdateState((prev) => ({
                                    ...prev,
                                    branding: {
                                      ...prev.branding,
                                      couponRegistrationClosedMessage: val,
                                    },
                                  }));
                                }}
                                placeholder="Tulis alasan atau jadwal pembukaan kembali..."
                                className="flex-1 px-3 py-1.5 rounded-lg bg-[#021b15] border border-amber-400/40 text-xs text-white focus:outline-none focus:border-amber-300"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Official PDF Report Buttons for Jalan Sehat Winners & All Coupons */}
                      <div className="flex flex-wrap items-center gap-2 bg-[#03251c] border border-amber-400/40 rounded-lg p-2.5">
                        <button
                          type="button"
                          onClick={async () => {
                            await downloadJalanSehatPdfReport(
                              appState.coupons,
                              appState.branding,
                              'winners_only'
                            );
                            notify('Laporan PDF Pemenang Doorprize Jalan Sehat berhasil diunduh!');
                          }}
                          className="flex-1 py-2 px-3 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>
                            Unduh PDF Pemenang ({appState.coupons.filter((c) => c.sudahMenang).length})
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await downloadJalanSehatPdfReport(
                              appState.coupons,
                              appState.branding,
                              'all_coupons'
                            );
                            notify('Laporan PDF Seluruh Peserta Kupon Jalan Sehat berhasil diunduh!');
                          }}
                          className="flex-1 py-2 px-3 rounded-lg bg-emerald-800 hover:bg-emerald-700 border border-emerald-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-amber-300" />
                          <span>Unduh PDF Semua Kupon ({appState.coupons.length})</span>
                        </button>
                      </div>

                      <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                        {appState.coupons.map((c) => {
                          const isEditing = editingCouponId === c.id;
                          return (
                            <div
                              key={c.id}
                              className="bg-[#03251c] px-3 py-2 rounded-lg text-xs space-y-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <span className="font-mono-tabular text-amber-300 font-bold mr-2">
                                    {c.nomorKupon}
                                  </span>
                                  <strong className="text-white">{c.namaPeserta}</strong> ({c.satkerAtauUmum})
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (isEditing) {
                                        setEditingCouponId(null);
                                        notify(
                                          `✓ Perubahan kupon ${c.nomorKupon} (${c.namaPeserta}) berhasil disimpan!`
                                        );
                                      } else {
                                        setEditingCouponId(c.id);
                                      }
                                    }}
                                    className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${
                                      isEditing
                                        ? 'bg-amber-400 text-slate-950'
                                        : 'text-amber-300 hover:text-amber-200 border border-emerald-700 bg-[#021b15]'
                                    }`}
                                  >
                                    {isEditing ? '✓ Simpan' : 'Edit'}
                                  </button>
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
                              </div>

                              {isEditing && (
                                <div className="space-y-2 pt-2 border-t border-emerald-800/70">
                                  <div className="flex items-center justify-between text-[11px] text-emerald-300 bg-[#021b15] px-2.5 py-1 rounded border border-emerald-800">
                                    <span>Nomor Undian & Barcode QR (Terkunci Permanen):</span>
                                    <strong className="font-mono-tabular text-amber-300">
                                      {c.nomorKupon}
                                    </strong>
                                  </div>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <input
                                      type="text"
                                      value={c.namaPeserta}
                                      onChange={(e) =>
                                        onUpdateState((prev) => ({
                                          ...prev,
                                          coupons: prev.coupons.map((item) =>
                                            item.id === c.id
                                              ? { ...item, namaPeserta: e.target.value }
                                              : item
                                          ),
                                        }))
                                      }
                                      placeholder="Nama Peserta"
                                      className="px-2 py-1 rounded bg-[#021b15] border border-emerald-700 text-xs text-white"
                                    />
                                    <input
                                      type="text"
                                      value={c.satkerAtauUmum}
                                      onChange={(e) =>
                                        onUpdateState((prev) => ({
                                          ...prev,
                                          coupons: prev.coupons.map((item) =>
                                            item.id === c.id
                                              ? { ...item, satkerAtauUmum: e.target.value }
                                              : item
                                          ),
                                        }))
                                      }
                                      placeholder="Satker / Umum"
                                      className="px-2 py-1 rounded bg-[#021b15] border border-emerald-700 text-xs text-white"
                                    />
                                    <input
                                      type="text"
                                      value={c.nikAtauNip}
                                      onChange={(e) =>
                                        onUpdateState((prev) => ({
                                          ...prev,
                                          coupons: prev.coupons.map((item) =>
                                            item.id === c.id
                                              ? { ...item, nikAtauNip: e.target.value }
                                              : item
                                          ),
                                        }))
                                      }
                                      placeholder="NIP / NIK"
                                      className="px-2 py-1 rounded bg-[#021b15] border border-emerald-700 text-xs text-white font-mono-tabular"
                                    />
                                    <input
                                      type="text"
                                      value={c.noHp}
                                      onChange={(e) =>
                                        onUpdateState((prev) => ({
                                          ...prev,
                                          coupons: prev.coupons.map((item) =>
                                            item.id === c.id
                                              ? { ...item, noHp: e.target.value }
                                              : item
                                          ),
                                        }))
                                      }
                                      placeholder="No. HP / WA"
                                      className="px-2 py-1 rounded bg-[#021b15] border border-emerald-700 text-xs text-white font-mono-tabular"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="bg-[#021b15] border border-emerald-800 rounded-xl p-4 space-y-3">
                      <h3 className="text-sm font-bold text-amber-300">
                        Moderasi Ucapan & Kotak Aspirasi ({appState.messages.length})
                      </h3>
                      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                        {appState.messages.map((m) => {
                          const isEditing = editingMsgId === m.id;
                          return (
                            <div
                              key={m.id}
                              className="bg-[#03251c] p-3 rounded-lg text-xs space-y-2"
                            >
                              <div className="flex items-start justify-between gap-3">
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
                                    onClick={() => {
                                      if (isEditing) {
                                        setEditingMsgId(null);
                                        notify(
                                          `✓ Perubahan ucapan dari "${m.nama}" berhasil disimpan!`
                                        );
                                      } else {
                                        setEditingMsgId(m.id);
                                      }
                                    }}
                                    className={`px-2.5 py-1 rounded border text-[11px] font-bold cursor-pointer ${
                                      isEditing
                                        ? 'bg-amber-400 text-slate-950 border-amber-300'
                                        : 'bg-[#021b15] border-emerald-700 text-amber-300'
                                    }`}
                                  >
                                    {isEditing ? '✓ Simpan' : 'Edit'}
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

                              {isEditing && (
                                <div className="pt-1.5 border-t border-emerald-800/70 space-y-1.5">
                                  <input
                                    type="text"
                                    value={m.nama}
                                    onChange={(e) =>
                                      onUpdateState((prev) => ({
                                        ...prev,
                                        messages: prev.messages.map((x) =>
                                          x.id === m.id ? { ...x, nama: e.target.value } : x
                                        ),
                                      }))
                                    }
                                    className="w-full px-2 py-1 rounded bg-[#021b15] border border-emerald-700 text-xs text-white"
                                  />
                                  <textarea
                                    rows={2}
                                    value={m.pesan}
                                    onChange={(e) =>
                                      onUpdateState((prev) => ({
                                        ...prev,
                                        messages: prev.messages.map((x) =>
                                          x.id === m.id ? { ...x, pesan: e.target.value } : x
                                        ),
                                      }))
                                    }
                                    className="w-full px-2 py-1 rounded bg-[#021b15] border border-emerald-700 text-xs text-slate-200"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
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

                    {/* Pengaturan Kode PIN Rahasia Admin */}
                    <div className="pt-2 border-t border-emerald-800/70 flex flex-wrap items-center justify-between gap-3">
                      <label className="text-xs font-semibold text-amber-300">
                        Kode PIN Rahasia Otorisasi Admin:
                      </label>
                      <input
                        type="password"
                        value={appState.branding.adminPin}
                        onChange={(e) =>
                          onUpdateState((prev) => ({
                            ...prev,
                            branding: {
                              ...prev.branding,
                              adminPin: e.target.value,
                            },
                          }))
                        }
                        placeholder="Ubah PIN Admin"
                        className="px-3 py-1.5 rounded-lg bg-[#03251c] border border-emerald-700 text-xs text-white font-mono-tabular w-44"
                      />
                    </div>

                    {/* 4. Pengaturan Suara Sambutan Pengunjung (2 Fitur: Ketik Teks & Link GitHub/Drive + On/Off & Hapus) */}
                    {(() => {
                      const voiceCfg = appState.branding.welcomeVoice || {
                        enabled: true,
                        mode: 'tts' as const,
                        welcomeText:
                          'Selamat datang di Portal Resmi Peringatan Hari Amal Bakti ke-81 Kementerian Agama Republik Indonesia, Kantor Kementerian Agama Kabupaten Tojo Una-Una Tahun 2027. Umat Rukun dan Sinergi, Indonesia Damai dan Maju.',
                        audioUrl: '',
                      };
                      const updateVoice = (partial: Partial<typeof voiceCfg>) => {
                        onUpdateState((prev) => ({
                          ...prev,
                          branding: {
                            ...prev.branding,
                            welcomeVoice: {
                              ...voiceCfg,
                              ...partial,
                            },
                          },
                        }));
                      };
                      return (
                        <div className="bg-[#03251c]/80 border border-amber-400/50 rounded-xl p-4 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <div className="text-xs font-bold text-amber-300">
                                4. Suara Sambutan Pengunjung (Welcome Voice / Audio)
                              </div>
                              <p className="text-[11px] text-slate-300">
                                Menyapa pengunjung secara otomatis saat membuka situs (Sangat ringan & tidak membebani situs).
                              </p>
                            </div>
                            {/* Tombol ON / OFF */}
                            <button
                              type="button"
                              onClick={() => {
                                const nextState = !voiceCfg.enabled;
                                updateVoice({ enabled: nextState });
                                notify(
                                  nextState
                                    ? 'Suara Sambutan Pengunjung: AKTIF (ON)'
                                    : 'Suara Sambutan Pengunjung: NONAKTIF (OFF)'
                                );
                              }}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                                voiceCfg.enabled
                                  ? 'bg-emerald-700 hover:bg-emerald-600 text-white border border-amber-400/60'
                                  : 'bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-500/50'
                              }`}
                            >
                              {voiceCfg.enabled ? 'Status: ON (Aktif)' : 'Status: OFF (Nonaktif)'}
                            </button>
                          </div>

                          {/* Pilihan 2 Mode: 1. Ketik Teks vs 2. Link GitHub / Google Drive */}
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => updateVoice({ mode: 'tts' })}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                                voiceCfg.mode === 'tts'
                                  ? 'bg-amber-400 text-slate-950'
                                  : 'bg-[#021b15] text-slate-300 hover:text-white border border-emerald-800'
                              }`}
                            >
                              1. Ketik Teks Sambutan (Suara Otomatis 0 KB)
                            </button>
                            <button
                              type="button"
                              onClick={() => updateVoice({ mode: 'audio_url' })}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                                voiceCfg.mode === 'audio_url'
                                  ? 'bg-amber-400 text-slate-950'
                                  : 'bg-[#021b15] text-slate-300 hover:text-white border border-emerald-800'
                              }`}
                            >
                              2. Tempel Link Audio GitHub / Google Drive (.MP3)
                            </button>
                          </div>

                          {voiceCfg.mode === 'tts' ? (
                            <div className="space-y-2">
                              <label className="block text-[11px] text-slate-300">
                                Ketik Kalimat Sambutan Bahasa Indonesia:
                              </label>
                              <textarea
                                rows={3}
                                value={voiceCfg.welcomeText}
                                onChange={(e) => updateVoice({ welcomeText: e.target.value })}
                                placeholder="Ketik kalimat sambutan resmi HAB ke-81 Kemenag Tojo Una-Una..."
                                className="w-full px-3 py-2 rounded-lg bg-[#021b15] border border-emerald-700 text-xs text-white leading-relaxed"
                              />
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (
                                      typeof window !== 'undefined' &&
                                      'speechSynthesis' in window &&
                                      voiceCfg.welcomeText.trim()
                                    ) {
                                      window.speechSynthesis.cancel();
                                      const u = new SpeechSynthesisUtterance(
                                        voiceCfg.welcomeText.trim()
                                      );
                                      u.lang = 'id-ID';
                                      u.rate = 0.98;
                                      window.speechSynthesis.speak(u);
                                      notify('Memutar pratinjau suara sambutan teks...');
                                    }
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-amber-200 text-xs font-semibold cursor-pointer"
                                >
                                  Tes Putar Suara Teks
                                </button>
                                {voiceCfg.welcomeText && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      updateVoice({ welcomeText: '' });
                                      notify('Teks suara sambutan berhasil dihapus.');
                                    }}
                                    className="px-3 py-1.5 rounded-lg bg-rose-950/90 hover:bg-rose-900 text-rose-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Hapus Teks Sambutan</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <label className="block text-[11px] text-slate-300">
                                Tempel Link Audio (.MP3) dari GitHub atau Google Drive:
                              </label>
                              <input
                                type="url"
                                value={voiceCfg.audioUrl}
                                onChange={(e) => updateVoice({ audioUrl: e.target.value })}
                                placeholder="https://raw.githubusercontent.com/Irfan45372/HABKEMENAGTOUNA/main/sambutan.mp3 atau Link Google Drive"
                                className="w-full px-3 py-2 rounded-lg bg-[#021b15] border border-emerald-700 text-xs text-amber-200 font-mono-tabular"
                              />
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-[11px] text-slate-400">
                                  Mendukung link GitHub (raw/blob) & link berbagi Google Drive.
                                </span>
                                {voiceCfg.audioUrl && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      updateVoice({ audioUrl: '' });
                                      notify('Link audio sambutan berhasil dihapus.');
                                    }}
                                    className="px-3 py-1.5 rounded-lg bg-rose-950/90 hover:bg-rose-900 text-rose-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Hapus Link Audio</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Running Text Ticker CRUD (Add, Inline Edit & Delete) */}
                    <div className="pt-3 border-t border-emerald-800 space-y-2">
                      <label className="block text-xs font-bold text-amber-300">
                        Running Text Pengumuman Penting (Top Ticker) — Tambah, Edit & Hapus
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
                      <div className="space-y-1.5 max-h-36 overflow-y-auto">
                        {appState.branding.runningTextItems.map((item, idx) => (
                          <div
                            key={idx}
                            className="bg-[#03251c] px-2.5 py-1.5 rounded text-xs flex items-center justify-between gap-2"
                          >
                            <input
                              type="text"
                              value={item}
                              onChange={(e) =>
                                onUpdateState((prev) => ({
                                  ...prev,
                                  branding: {
                                    ...prev.branding,
                                    runningTextItems: prev.branding.runningTextItems.map(
                                      (txt, i) => (i === idx ? e.target.value : txt)
                                    ),
                                  },
                                }))
                              }
                              className="flex-1 px-2 py-1 rounded bg-[#021b15] border border-emerald-800 text-xs text-slate-200"
                            />
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
                              className="text-rose-400 shrink-0 cursor-pointer px-1.5"
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
                      {/* Live Firebase Cloud Database Status Card */}
                      <div className="bg-[#03251c] border border-amber-400/50 rounded-xl p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                            <Cloud className="w-4 h-4" />
                            <span>Database Firebase Cloud ({ADMIN_EMAIL})</span>
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              firebaseConnected
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {firebaseConnected ? 'ONLINE · REAL-TIME' : 'MENGHUBUNGKAN...'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          Semua pendaftaran lomba, kupon jalan sehat, kiriman spanduk/foto Satker, video YouTube, ucapan, dan perubahan Admin <strong>otomatis tersimpan ke Cloud Firestore</strong> secara <em>real-time</em> di semua perangkat tanpa perlu push ulang ke GitHub.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={isSyncingCloud}
                            onClick={async () => {
                              setIsSyncingCloud(true);
                              await syncFullStateToCloud(appState);
                              setIsSyncingCloud(false);
                              notify('Seluruh data berhasil disinkronkan ke Firebase Cloud Database!');
                            }}
                            className="flex-1 py-2 px-3 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Cloud className="w-3.5 h-3.5" />
                            <span>
                              {isSyncingCloud
                                ? 'Menyinkronkan ke Cloud...'
                                : 'Sinkronkan Paksa ke Firebase Cloud'}
                            </span>
                          </button>
                          {currentUser && (
                            <button
                              type="button"
                              onClick={() => void signOutFirebase()}
                              className="py-2 px-3 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-slate-300 text-[11px] font-semibold cursor-pointer"
                            >
                              Logout ({currentUser.email})
                            </button>
                          )}
                        </div>
                      </div>

                      <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2 pt-1">
                        <ShieldCheck className="w-4 h-4" />
                        Cadangan JSON & GitHub (Irfan45372/HABKEMENAGTOUNA)
                      </h3>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Opsional: Anda tetap dapat mengunduh cadangan file{' '}
                        <code className="text-amber-300 font-mono-tabular">
                          hab81-kemenag-touna-2027-state.json
                        </code>{' '}
                        kapan saja sebagai arsip lokal atau cadangan di repositori GitHub.
                      </p>

                      <button
                        type="button"
                        onClick={handleExportJson}
                        className="w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
                      >
                        <Download className="w-4 h-4" />
                        <span>1. Unduh Cadangan hab81-kemenag-touna-2027-state.json</span>
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

            {/* Bottom Modal Footer with Explicit Save Button */}
            <div className="px-6 py-3 bg-[#021b15] border-t border-emerald-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 shrink-0">
              <span className="flex items-center gap-1.5 text-emerald-300">
                <Cloud className="w-3.5 h-3.5 text-amber-300" />
                {firebaseConnected
                  ? `Firebase Cloud Sync Aktif (${ADMIN_EMAIL}) + Backup localStorage`
                  : 'Auto-Persistence Aktif (localStorage)'}
              </span>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  data-testid="admin-footer-save-all"
                  onClick={async () => {
                    setEditingCompId(null);
                    setEditingSchId(null);
                    setEditingRegId(null);
                    setEditingVidId(null);
                    setEditingBannerId(null);
                    setEditingCouponId(null);
                    setEditingMsgId(null);
                    setIsSyncingCloud(true);
                    try {
                      await syncFullStateToCloud(appState);
                      notify(
                        '✓ Seluruh perubahan Admin berhasil disimpan permanen ke Cloud & Perangkat!'
                      );
                    } finally {
                      setIsSyncingCloud(false);
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {isSyncingCloud ? 'Menyimpan...' : 'Simpan Semua Perubahan'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await syncFullStateToCloud(appState);
                    onClose();
                  }}
                  className="px-3.5 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-700 border border-emerald-600 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 text-amber-300" />
                  <span>Simpan & Tutup Panel</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
