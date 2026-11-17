import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BrandingConfig,
  Competition,
  MatchScore,
  ParticipantRegistration,
  TournamentDrawMode,
  TournamentDrawSession,
  VideoItem,
} from '../types/hab';
import {
  extractYoutubeEmbedUrl,
  generateKnockoutDrawMatches,
  generatePoolDrawGroups,
  normalizeCompetitionCategory,
  shuffleParticipantsSecure,
} from '../utils/habLogic';
import { downloadTournamentDrawPdfReport } from '../utils/pdfReportGenerator';
import { buildDeepLink, shareToWhatsAppWithFullImage } from '../utils/shareUtils';
import {
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Film,
  GitBranch,
  ListOrdered,
  Lock,
  Maximize2,
  Minimize2,
  Play,
  RefreshCw,
  RotateCcw,
  Share2,
  Shuffle,
  Trash2,
  Trophy,
  Unlock,
  Users,
  VideoOff,
  X,
  Youtube,
} from 'lucide-react';

interface LiveTournamentDrawPanelProps {
  branding?: BrandingConfig;
  competitions: Competition[];
  satkerList: string[];
  registrations: ParticipantRegistration[];
  videos: VideoItem[];
  liveDrawYoutubeUrl: string;
  tournamentDraws: TournamentDrawSession[];
  adminPin: string;
  isAdminUnlocked: boolean;
  onUnlockAdmin?: () => void;
  onUpdateLiveDrawYoutubeUrl: (url: string) => void;
  onAddTournamentDraw: (session: TournamentDrawSession) => void;
  onDeleteTournamentDraw: (id: string) => void;
  onSyncMatchesFromDraw: (matchesToAdd: MatchScore[], drawId: string) => void;
}

export const LiveTournamentDrawPanel: React.FC<LiveTournamentDrawPanelProps> = ({
  branding,
  competitions,
  satkerList,
  registrations,
  videos,
  liveDrawYoutubeUrl,
  tournamentDraws,
  adminPin,
  isAdminUnlocked,
  onUnlockAdmin,
  onUpdateLiveDrawYoutubeUrl,
  onAddTournamentDraw,
  onDeleteTournamentDraw,
  onSyncMatchesFromDraw,
}) => {
  // Admin PIN Prompt
  const [showPinPrompt, setShowPinPrompt] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Live YouTube URL Controls
  const [youtubeInput, setYoutubeInput] = useState<string>(liveDrawYoutubeUrl || '');
  const [youtubeSavedNotice, setYoutubeSavedNotice] = useState<string | null>(null);
  const [selectedGalleryVideoId, setSelectedGalleryVideoId] = useState<string>('');

  useEffect(() => {
    setYoutubeInput(liveDrawYoutubeUrl || '');
    if (!liveDrawYoutubeUrl) {
      setSelectedGalleryVideoId('');
    }
  }, [liveDrawYoutubeUrl]);

  // Manual Draw Input State (Admin)
  const [judulLomba, setJudulLomba] = useState<string>('Bola Voli Putra Antar-Satker');
  const [kategoriUtama, setKategoriUtama] = useState<'Olahraga' | 'Lomba'>('Olahraga');
  const [drawMode, setDrawMode] = useState<TournamentDrawMode>('pool');
  const [jumlahPool, setJumlahPool] = useState<number>(4);
  const [catatanTm, setCatatanTm] = useState<string>('');
  const [rawTeamsText, setRawTeamsText] = useState<string>('');
  const [regSourceFilter, setRegSourceFilter] = useState<string>('ALL');

  // Spin Animation State
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [rollingPreviewNames, setRollingPreviewNames] = useState<string[]>([]);
  const [drawError, setDrawError] = useState<string | null>(null);
  const [drawNotice, setDrawNotice] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [showReadmeGuide, setShowReadmeGuide] = useState<boolean>(false);
  const [fullScreenMode, setFullScreenMode] = useState<'none' | 'video' | 'split'>('none');
  const fullScreenContainerRef = useRef<HTMLDivElement | null>(null);
  const operatorPanelRef = useRef<HTMLDivElement | null>(null);

  const spinIntervalRef = useRef<number | null>(null);
  const spinTimeoutRef = useRef<number | null>(null);

  // Active displayed draw session (defaults to latest)
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    () => tournamentDraws[0]?.id || ''
  );

  useEffect(() => {
    if (tournamentDraws.length === 0) {
      setSelectedSessionId('');
      return;
    }
    const exists = tournamentDraws.some((d) => d.id === selectedSessionId);
    if (!exists) {
      setSelectedSessionId(tournamentDraws[0].id);
    }
  }, [tournamentDraws, selectedSessionId]);

  useEffect(() => {
    return () => {
      if (spinIntervalRef.current) window.clearInterval(spinIntervalRef.current);
      if (spinTimeoutRef.current) window.clearTimeout(spinTimeoutRef.current);
    };
  }, []);

  const parsedTeams = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    rawTeamsText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => {
        const key = line.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          list.push(line);
        }
      });
    return list;
  }, [rawTeamsText]);

  const galleryYoutubeVideos = useMemo(
    () => videos.filter((v) => v.sumberipe === 'youtube' && Boolean(v.youtubeUrl)),
    [videos]
  );

  const activeYoutubeUrl = useMemo(() => {
    if (liveDrawYoutubeUrl && extractYoutubeEmbedUrl(liveDrawYoutubeUrl)) {
      return liveDrawYoutubeUrl;
    }
    return '';
  }, [liveDrawYoutubeUrl]);

  const activeYoutubeEmbedUrl = useMemo(() => {
    if (!activeYoutubeUrl) return null;
    const base = extractYoutubeEmbedUrl(activeYoutubeUrl);
    if (!base) return null;
    return `${base}?fs=1&playsinline=1&rel=0`;
  }, [activeYoutubeUrl]);

  const handleOpenFullScreen = (mode: 'video' | 'split') => {
    setFullScreenMode(mode);
  };

  const handleCloseFullScreen = () => {
    try {
      if (document.fullscreenElement) {
        void document.exitFullscreen();
      }
    } catch {
      // Ignore fullscreen exit errors
    }
    setFullScreenMode('none');
  };

  const handleRequestBrowserFullscreen = () => {
    try {
      const el = fullScreenContainerRef.current;
      if (el && el.requestFullscreen) {
        void el.requestFullscreen();
      }
    } catch {
      // Fallback safely to fixed CSS 100dvh fullscreen overlay on mobile/iOS
    }
  };

  const activeSession = useMemo(
    () =>
      tournamentDraws.find((d) => d.id === selectedSessionId) ||
      tournamentDraws[0] ||
      null,
    [tournamentDraws, selectedSessionId]
  );

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === (adminPin || '812027')) {
      setPinError(null);
      setPinInput('');
      setShowPinPrompt(false);
      onUnlockAdmin?.();
    } else {
      setPinError('PIN Admin tidak sesuai.');
    }
  };

  const handleSaveYoutubeLiveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdminUnlocked) {
      setShowPinPrompt(true);
      return;
    }
    const trimmed = youtubeInput.trim();
    if (!trimmed) {
      onUpdateLiveDrawYoutubeUrl('');
      setYoutubeSavedNotice('Tautan Live YouTube telah dikosongkan.');
      window.setTimeout(() => setYoutubeSavedNotice(null), 3500);
      return;
    }
    if (!extractYoutubeEmbedUrl(trimmed)) {
      setDrawError(
        'Format Link YouTube tidak valid. Gunakan link seperti https://www.youtube.com/live/... atau https://www.youtube.com/watch?v=... atau https://youtu.be/...'
      );
      return;
    }
    setDrawError(null);
    onUpdateLiveDrawYoutubeUrl(trimmed);
    setYoutubeSavedNotice('Link YouTube Live berhasil disimpan dan langsung tayang ke semua peserta!');
    window.setTimeout(() => setYoutubeSavedNotice(null), 4000);
  };

  const handlePickGalleryVideo = (videoId: string) => {
    setSelectedGalleryVideoId(videoId);
    if (!videoId) return;
    const found = galleryYoutubeVideos.find((v) => v.id === videoId);
    if (found?.youtubeUrl) {
      setYoutubeInput(found.youtubeUrl);
      if (isAdminUnlocked) {
        onUpdateLiveDrawYoutubeUrl(found.youtubeUrl);
        setYoutubeSavedNotice(`Link "${found.judul}" dari Galeri Video langsung dipasang ke Layar Live!`);
        window.setTimeout(() => setYoutubeSavedNotice(null), 4000);
      }
    }
  };

  const handleNeutralizeLiveScreen = () => {
    if (!isAdminUnlocked) {
      setShowPinPrompt(true);
      return;
    }
    setDrawError(null);
    setYoutubeInput('');
    setSelectedGalleryVideoId('');
    onUpdateLiveDrawYoutubeUrl('');
    setYoutubeSavedNotice(
      '✓ Layar siaran langsung berhasil dinetralkan. Pengunjung kini melihat status: Tidak Ada Video / Siaran Live Saat Ini.'
    );
    window.setTimeout(() => setYoutubeSavedNotice(null), 4500);
  };

  const handlePullFromRegistrations = () => {
    setDrawError(null);
    const filtered = registrations.filter((reg) => {
      if (regSourceFilter === 'ALL') return true;
      if (regSourceFilter === 'CAT_OLAHRAGA') {
        return normalizeCompetitionCategory(reg.kategori) === 'Olahraga';
      }
      if (regSourceFilter === 'CAT_LOMBA') {
        return normalizeCompetitionCategory(reg.kategori) === 'Lomba';
      }
      return reg.competitionId === regSourceFilter;
    });

    if (filtered.length === 0) {
      setDrawError(
        'Belum ada pendaftar pada filter tersebut. Anda bisa mengetik daftar tim secara manual di kotak teks atau mengambil Daftar Satker.'
      );
      return;
    }

    const lines = filtered.map((r) =>
      r.namaTimAtauPeserta && r.namaTimAtauPeserta !== r.satker
        ? `${r.namaTimAtauPeserta} (${r.satker})`
        : r.satker
    );
    setRawTeamsText(lines.join('\n'));
    setDrawNotice(
      `✓ ${lines.length} tim/peserta diambil dari data pendaftar ke kotak input manual. Silakan edit/tambah jika ada tim susulan.`
    );
    window.setTimeout(() => setDrawNotice(null), 4000);
  };

  const handlePullFromSatkers = () => {
    setDrawError(null);
    if (satkerList.length === 0) return;
    setRawTeamsText(satkerList.join('\n'));
    setDrawNotice(
      `✓ ${satkerList.length} nama Satker dimuat ke kotak input manual. Hapus Satker yang tidak mengikuti cabang ini sebelum memutar undian.`
    );
    window.setTimeout(() => setDrawNotice(null), 4000);
  };

  const handleRunDrawMachine = () => {
    if (!isAdminUnlocked) {
      setShowPinPrompt(true);
      return;
    }
    setDrawError(null);
    setDrawNotice(null);

    const cleanTitle = judulLomba.trim();
    if (cleanTitle.length < 3) {
      setDrawError('Ketik Nama Jenis Olahraga / Lomba terlebih dahulu (minimal 3 karakter).');
      return;
    }
    if (parsedTeams.length < 2) {
      setDrawError('Masukkan minimal 2 tim atau peserta (1 baris = 1 tim) untuk memulai pengundian.');
      return;
    }
    if (isSpinning) return;

    setIsSpinning(true);
    setRollingPreviewNames(shuffleParticipantsSecure(parsedTeams).slice(0, 6));

    spinIntervalRef.current = window.setInterval(() => {
      setRollingPreviewNames(shuffleParticipantsSecure(parsedTeams).slice(0, 6));
    }, 95);

    spinTimeoutRef.current = window.setTimeout(() => {
      if (spinIntervalRef.current) {
        window.clearInterval(spinIntervalRef.current);
        spinIntervalRef.current = null;
      }

      const finalOrder = shuffleParticipantsSecure(parsedTeams);
      const nowLabel = `${new Date().toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })} · ${new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      })} WITA`;

      const sessionId = `draw-${Date.now()}`;
      const newSession: TournamentDrawSession = {
        id: sessionId,
        judulLomba: cleanTitle,
        kategoriUtama,
        mode: drawMode,
        youtubeUrl: activeYoutubeUrl || undefined,
        pesertaInput: parsedTeams,
        nomorUrutResult: drawMode === 'nomor_urut' ? finalOrder : undefined,
        poolGroups:
          drawMode === 'pool' ? generatePoolDrawGroups(finalOrder, jumlahPool) : undefined,
        knockoutMatches:
          drawMode === 'gugur' ? generateKnockoutDrawMatches(finalOrder) : undefined,
        jumlahPool: drawMode === 'pool' ? jumlahPool : undefined,
        catatan: catatanTm.trim() || undefined,
        waktuUndian: nowLabel,
        syncedToScoreboard: false,
      };

      onAddTournamentDraw(newSession);
      setSelectedSessionId(sessionId);
      setIsSpinning(false);
      setRollingPreviewNames([]);
      setDrawNotice(
        `✓ Pengundian "${cleanTitle}" (${parsedTeams.length} Tim/Peserta) selesai & langsung tayang Real-Time ke semua pengguna!`
      );
    }, 2000);
  };

  const handleAbortSpin = () => {
    if (spinIntervalRef.current) {
      window.clearInterval(spinIntervalRef.current);
      spinIntervalRef.current = null;
    }
    if (spinTimeoutRef.current) {
      window.clearTimeout(spinTimeoutRef.current);
      spinTimeoutRef.current = null;
    }
    setIsSpinning(false);
    setRollingPreviewNames([]);
    setDrawError(null);
    setDrawNotice(
      'Putaran mesin undian dibatalkan sebelum hasil disimpan. Silakan periksa kembali daftar tim sebelum memutar ulang.'
    );
  };

  const handleCancelAndRepeatSession = (session: TournamentDrawSession) => {
    if (!isAdminUnlocked) {
      setShowPinPrompt(true);
      return;
    }
    setDrawError(null);
    setJudulLomba(session.judulLomba);
    setKategoriUtama(session.kategoriUtama);
    setDrawMode(session.mode);
    if (session.jumlahPool) {
      setJumlahPool(session.jumlahPool);
    }
    setCatatanTm(session.catatan || '');
    setRawTeamsText(session.pesertaInput.join('\n'));

    onDeleteTournamentDraw(session.id);

    setDrawNotice(
      `✓ Hasil undian "${session.judulLomba}" dibatalkan & dihapus${
        session.syncedToScoreboard ? ' (termasuk jadwal di Papan Skor Live)' : ''
      }. Daftar tim telah dimuat ulang ke panel editor — silakan koreksi lalu tekan Putar untuk mengulang.`
    );
    window.setTimeout(() => {
      operatorPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  };

  const handleDeleteSessionWithNotice = (session: TournamentDrawSession) => {
    if (!isAdminUnlocked) {
      setShowPinPrompt(true);
      return;
    }
    setDrawError(null);
    onDeleteTournamentDraw(session.id);
    setDrawNotice(
      `✓ Sesi undian "${session.judulLomba}" dihapus permanen${
        session.syncedToScoreboard ? ' beserta jadwal terkait di Papan Skor Live' : ''
      }.`
    );
  };

  const handleSyncToScoreboard = (session: TournamentDrawSession) => {
    if (!isAdminUnlocked) {
      setShowPinPrompt(true);
      return;
    }
    const generatedMatches: MatchScore[] = [];
    if (session.mode === 'gugur' && session.knockoutMatches) {
      session.knockoutMatches.forEach((m) => {
        if (m.isBye) return;
        generatedMatches.push({
          id: `match-${session.id}-p${m.matchNumber}`,
          competitionId: 'custom-draw',
          competitionName: session.judulLomba,
          babak: `Partai #${m.matchNumber} — ${m.roundLabel}`,
          kontingenA: m.teamA,
          kontingenB: m.teamB,
          skorA: '0',
          skorB: '0',
          waktu: 'Jadwal Menyusul (Hasil Undian Live)',
          lokasi: 'Arena HAB ke-81 Kemenag Touna',
          status: 'Terjadwal',
        });
      });
    } else if (session.mode === 'pool' && session.poolGroups) {
      let idxCounter = 1;
      session.poolGroups.forEach((grp) => {
        for (let i = 0; i < grp.teams.length; i++) {
          for (let j = i + 1; j < grp.teams.length; j++) {
            generatedMatches.push({
              id: `match-${session.id}-g${idxCounter++}`,
              competitionId: 'custom-draw',
              competitionName: session.judulLomba,
              babak: `Penyisihan ${grp.groupName}`,
              kontingenA: grp.teams[i],
              kontingenB: grp.teams[j],
              skorA: '0',
              skorB: '0',
              waktu: 'Jadwal Menyusul (Hasil Undian Pool)',
              lokasi: 'Arena HAB ke-81 Kemenag Touna',
              status: 'Terjadwal',
            });
          }
        }
      });
    }

    if (generatedMatches.length === 0) {
      setDrawError('Tidak ada pasangan pertandingan yang dapat dikirim ke Papan Skor.');
      return;
    }

    onSyncMatchesFromDraw(generatedMatches, session.id);
    setDrawNotice(
      `✓ ${generatedMatches.length} partai pertandingan dari "${session.judulLomba}" otomatis masuk ke tab Papan Skor!`
    );
    window.setTimeout(() => setDrawNotice(null), 5000);
  };

  const formatSessionSummaryText = (session: TournamentDrawSession): string => {
    const lines: string[] = [
      `*HASIL UNDIAN RESMI HAB KE-81 KEMENAG TOJO UNA-UNA*`,
      `*Cabang:* ${session.judulLomba} (${session.kategoriUtama})`,
      `*Waktu Undian:* ${session.waktuUndian}`,
      `*Total Peserta/Tim:* ${session.pesertaInput.length}`,
      '',
    ];

    if (session.mode === 'nomor_urut' && session.nomorUrutResult) {
      lines.push('*DAFTAR NOMOR URUT TAMPIL:*');
      session.nomorUrutResult.forEach((name, idx) => {
        lines.push(`${idx + 1}. ${name}`);
      });
    } else if (session.mode === 'pool' && session.poolGroups) {
      lines.push('*PEMBAGIAN POOL / GRUP:*');
      session.poolGroups.forEach((grp) => {
        lines.push(`\n*${grp.groupName}:*`);
        grp.teams.forEach((t, i) => lines.push(`  ${i + 1}. ${t}`));
      });
    } else if (session.mode === 'gugur' && session.knockoutMatches) {
      lines.push('*PASANGAN PERTANDINGAN (SISTEM GUGUR):*');
      session.knockoutMatches.forEach((m) => {
        lines.push(`Partai #${m.matchNumber}: ${m.teamA} vs ${m.teamB}`);
      });
    }

    if (session.catatan) {
      lines.push(`\nCatatan: ${session.catatan}`);
    }
    const link = buildDeepLink({ menu: 'lomba', undian: '1' });
    lines.push(`\nLihat Live & Hasil Lengkap:\n${link}`);
    return lines.join('\n');
  };

  const handleShareDrawToWa = async (session: TournamentDrawSession) => {
    const waText = formatSessionSummaryText(session);
    await shareToWhatsAppWithFullImage({
      title: `Hasil Undian ${session.judulLomba} — HAB ke-81`,
      waText,
      imageSrc: '/Kementerian-Agama.png',
      fileName: `undian-${session.id}.jpg`,
    });
  };

  const handleCopyDeepLink = async () => {
    const link = buildDeepLink({ menu: 'lomba', undian: '1' });
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 3000);
    } catch {
      setCopiedLink(true);
    }
  };

  const handleDownloadReadmeMarkdown = () => {
    const content = `# PANDUAN TEKNIS OPERATOR — MESIN UNDIAN LIVE & YOUTUBE STREAMING HAB KE-81

Portal Resmi: Peringatan Hari Amal Bakti Ke-81 Kementerian Agama Kabupaten Tojo Una-Una Tahun 2027

## 1. Persiapan Siaran Live YouTube (Sebelum Undian Dimulai)
Admin memiliki 2 pilihan cara menyiarkan Live Streaming Undian:
- **Cara A (Kamera HP / Panggung Panitia):** Buka aplikasi YouTube di HP -> tekan (+) -> *Live Streaming* untuk menyorot MC/Panitia Technical Meeting, lalu salin link Live YouTube-nya.
- **Cara B (Rekam Layar Laptop via OBS Studio):** Buka OBS Studio -> tambahkan *Window/Display Capture* ke browser yang membuka halaman **Mesin Undian Live** di website ini + Audio Mic panitia -> *Start Streaming* ke YouTube Live -> salin link Live YouTube-nya.

## 2. Cara Admin Memasang Link Live YouTube ke Website
1. Buka website -> masuk ke menu **Pendaftaran Lomba & Klasemen** -> klik tab **Mesin Undian Live**.
2. Klik **Buka Kontrol Admin (PIN)** dan masukkan PIN Admin.
3. Pada kotak **Link Live Streaming YouTube**:
   - Jika link sudah pernah disimpan di menu **05. Galeri Video** (kategori *Live Streaming & Upacara*), Admin cukup memilihnya pada dropdown **"Ambil dari Galeri Video"** (otomatis terpasang).
   - Atau tempel langsung link YouTube baru (mendukung format \`youtube.com/live/...\`, \`youtube.com/watch?v=...\`, atau \`youtu.be/...\`), lalu klik **Tayangkan**.
   - Jika siaran sudah selesai atau belum waktunya live, tekan tombol **Netralkan Layar** agar pemutar video dikosongkan dan pengunjung tahu **Tidak Ada Video / Siaran Live Saat Ini**.
4. Pemutar video YouTube Live hanya tampil saat link ditayangkan oleh Admin.

## 3. Cara Admin Mengambil atau Mengetik Daftar Tim / Peserta
Karena jenis olahraga atau cabang lomba saat Technical Meeting sering dipecah lebih detail (misalnya Voli Putra, Voli Putri, Bulu Tangkis Ganda Putra, MTQ ASN, dll.), Admin dapat mengisi daftar tim dengan **sangat fleksibel**:
- **Ketik / Tempel Manual (Disarankan):** Ketik langsung nama tim/kontingen di kotak **"Daftar Tim / Peserta Undian"** dengan aturan **1 baris = 1 tim/peserta**.
- **Atau Ambil Cepat dari Data Website (Opsional):**
  1. Pilih filter pendaftar pada dropdown (Semua Pendaftar / Kategori Olahraga / Kategori Lomba / per Cabang), lalu klik **Ambil Data Pendaftar**, ATAU klik **Ambil Daftar Satker** untuk memuat semua Satker Kemenag Touna.
  2. Data otomatis masuk ke kotak ketikan manual—Admin tetap bebas mengedit, menambah tim susulan, atau menghapus baris tim yang tidak ikut sebelum diputar.

## 4. Memilih Mode & Menekan Mesin Undian (Full Lomba atau Nomor Urut)
1. Ketik **Nama Jenis Olahraga / Lomba** (contoh: *Bola Voli Putra Antar-Satker*).
2. Pilih **Mode Pengundian**:
   - **Undian Pembagian Pool / Grup (Full Lomba):** Pilih jumlah Grup (2, 3, 4, 6, atau 8 Grup). Sistem membagi tim secara acak merata ke Grup A, Grup B, dst.
   - **Undian Bagan Sistem Gugur (Full Match):** Sistem mengacak dan langsung memasangkan Partai #1, Partai #2, dst. (otomatis memberi status **BYE** jika jumlah tim ganjil).
   - **Undian Nomor Urut Tampil:** Sistem mengacak urutan tampil #01, #02, #03, dst. untuk lomba seni/keagamaan.
3. Tekan tombol besar **"PUTAR MESIN UNDIAN SEKARANG"**.
4. Animasi pengocokan berjalan selama ~2 detik di layar, lalu hasil akhir otomatis terkunci dan tersimpan **Real-Time** ke Cloud Firestore sehingga semua peserta yang membuka website langsung melihat hasilnya detik itu juga.

## 5. Tindak Lanjut Setelah Hasil Undian Keluar
- **Kirim ke Papan Skor Live:** Untuk mode *Pool* atau *Sistem Gugur*, klik tombol **Kirim ke Papan Skor Live** agar seluruh pasangan tanding otomatis masuk ke daftar jadwal pertandingan di tab *Papan Skor*.
- **Berita Acara PDF & WhatsApp:** Klik **Unduh Berita Acara PDF** untuk arsip resmi ber-Kop Kemenag Tojo Una-Una, atau **Bagikan Hasil ke WA** untuk dikirim ke grup kontingen.
- **Batalkan Putaran / Ulangi Undian:** Saat mesin masih berputar (~2 detik), tekan **Batalkan Putaran** untuk menggagalkan sebelum hasil terkunci. Jika hasil sudah tayang namun terjadi kekeliruan teknis, klik **Batalkan & Ulangi** pada papan hasil untuk menghapus hasil lama (otomatis membersihkan jadwal terkait di *Papan Skor Live*) sekaligus mengembalikan daftar tim ke editor untuk diputar ulang.
- **Hapus Hasil Salah/Uji Coba:** Jika Admin menekan **Hapus**, data hasil undian (beserta jadwal di *Papan Skor Live* jika pernah disinkronkan) langsung terhapus permanen dari database Cloud Firestore dan tidak akan muncul kembali.
`;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'README_MESIN_UNDIAN_LIVE.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Bar: Title, Admin Unlock & Readme Toggle */}
      <div className="bg-[#03251c] border border-emerald-800/80 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
            <Youtube className="w-4 h-4 text-rose-400" />
            <span>Siaran Technical Meeting & Pengundian Real-Time Cloud Firestore</span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-white mt-0.5">
            Mesin Undian Full Lomba, Pool Turnamen & Nomor Urut Tampil
          </h3>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Admin dapat mengetik bebas daftar tim olahraga maupun peserta lomba (atau mengambil dari data pendaftar/Satker), menempel link YouTube Live, dan memutar mesin undian secara langsung.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleOpenFullScreen(activeYoutubeEmbedUrl ? 'split' : 'video')}
            className="px-3.5 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-700 border border-amber-400/50 text-amber-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Maximize2 className="w-3.5 h-3.5 text-amber-300" />
            <span>Layar Penuh (HP)</span>
          </button>
          {isAdminUnlocked && (
            <button
              type="button"
              onClick={() => setShowReadmeGuide((prev) => !prev)}
              className="px-3.5 py-2 rounded-lg bg-[#021b15] hover:bg-emerald-900 border border-emerald-700 text-emerald-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-300" />
              <span>{showReadmeGuide ? 'Tutup Panduan Admin' : 'Panduan Teknis (README)'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleCopyDeepLink}
            className="px-3.5 py-2 rounded-lg bg-[#021b15] hover:bg-emerald-900 border border-emerald-700 text-amber-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Link Disalin!' : 'Salin Link Undian'}</span>
          </button>
          {!isAdminUnlocked ? (
            <button
              type="button"
              onClick={() => setShowPinPrompt((prev) => !prev)}
              className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Buka Kontrol Admin (PIN)</span>
            </button>
          ) : (
            <span className="px-3.5 py-2 rounded-lg bg-emerald-900/90 border border-amber-400/50 text-amber-300 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap">
              <Unlock className="w-3.5 h-3.5" />
              <span>Kontrol Operator Admin Aktif</span>
            </span>
          )}
        </div>
      </div>

      {/* Collapsible Operator README Guide — ADMIN ONLY */}
      {isAdminUnlocked && showReadmeGuide && (
        <div className="bg-[#021b15] border border-amber-400/60 rounded-2xl p-5 space-y-4 text-xs text-slate-200 leading-relaxed">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-800 pb-3">
            <div>
              <h4 className="text-sm font-bold text-amber-300">
                Dokumentasi Teknis Operator — Mesin Undian Live & YouTube Streaming
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Alur lengkap dari persiapan data, menyalin link YouTube Live, hingga menekan mesin undian full lomba atau nomor urut.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadReadmeMarkdown}
              className="px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh README (.md)</span>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-xl bg-[#03251c] border border-emerald-800/80 space-y-1.5">
              <div className="font-bold text-amber-300">Langkah 1: Siapkan, Tayangkan &amp; Netralkan Live</div>
              <p className="text-slate-300">
                Mulai Live YouTube, salin link-nya (atau pilih dari <strong>Galeri Video</strong>) lalu klik <strong>Tayangkan</strong>. Setelah acara selesai, klik <strong>Netralkan Layar</strong> agar layar kembali standby (tanpa video live aktif).
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#03251c] border border-emerald-800/80 space-y-1.5">
              <div className="font-bold text-amber-300">Langkah 2: Ketik / Ambil Daftar Tim</div>
              <p className="text-slate-300">
                Ketik nama jenis olahraga/lomba secara bebas (misal <em>Bola Voli Putra</em>), lalu ketik/tempel daftar tim (1 baris = 1 tim). Bisa juga klik <strong>Ambil Data Pendaftar</strong> atau <strong>Ambil Daftar Satker</strong> lalu edit manual.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#03251c] border border-emerald-800/80 space-y-1.5">
              <div className="font-bold text-amber-300">Langkah 3: Pilih Mode &amp; Putar Undian</div>
              <p className="text-slate-300">
                Pilih mode <strong>Pool / Grup</strong> (full turnamen), <strong>Sistem Gugur</strong> (matchup), atau <strong>Nomor Urut Tampil</strong>, lalu tekan <strong>Putar Mesin Undian Sekarang</strong>. Hasil langsung tayang Real-Time ke semua penonton.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#03251c] border border-emerald-800/80 space-y-1.5">
              <div className="font-bold text-amber-300">Langkah 4: Kirim Skor &amp; Batal / Ulang</div>
              <p className="text-slate-300">
                Klik <strong>Kirim ke Papan Skor Live</strong>, unduh <strong>Berita Acara PDF</strong>, atau bagikan ke WA. Jika ada kesalahan teknis, tekan <strong>Batalkan Putaran</strong> saat mengocok atau <strong>Batalkan &amp; Ulangi</strong> pada papan hasil.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Admin PIN Verification Box */}
      {showPinPrompt && !isAdminUnlocked && (
        <form
          onSubmit={handleVerifyPin}
          className="bg-[#021b15] border-2 border-amber-400/70 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2 text-xs text-slate-200">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Masukkan <strong>PIN Admin</strong> untuk mengelola Link Live YouTube, mengisi daftar tim, dan memutar Mesin Undian:
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
              Verifikasi PIN
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

      {drawError && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-rose-950/90 border border-rose-500/50 text-xs text-rose-200"
        >
          {drawError}
        </div>
      )}

      {drawNotice && (
        <div
          role="status"
          className="p-3.5 rounded-xl bg-emerald-900/90 border border-emerald-400/60 text-xs text-emerald-100 flex items-center gap-2 font-semibold"
        >
          <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
          <span>{drawNotice}</span>
        </div>
      )}

      {/* Main Split: Left = Live Streaming YouTube, Right = Mesin Undian Manual Admin (or Public Info if locked) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 5 Cols: Integrated YouTube Live Player + Quick Copy from Galeri Video */}
        <div className="lg:col-span-5 bg-[#03251c] border border-emerald-800/80 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-4 py-3 border-b border-emerald-800/80 flex flex-wrap items-center justify-between gap-2 bg-[#021b15]">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Youtube className="w-4 h-4 text-rose-400" />
              <span>Layar Siaran Langsung</span>
              <span
                className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${
                  activeYoutubeEmbedUrl ? 'text-rose-300' : 'text-slate-400'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    activeYoutubeEmbedUrl ? 'bg-rose-500 animate-pulse' : 'bg-slate-500'
                  }`}
                />
                {activeYoutubeEmbedUrl ? 'Live Aktif' : 'Standby / Offline'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isAdminUnlocked && (activeYoutubeUrl || youtubeInput.trim()) && (
                <button
                  type="button"
                  onClick={handleNeutralizeLiveScreen}
                  className="px-2.5 py-1 rounded-md bg-rose-950/90 hover:bg-rose-900 border border-rose-500/40 text-rose-200 font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                  title="Kosongkan & netralkan layar siaran langsung jika tidak ada acara live"
                >
                  <VideoOff className="w-3 h-3" />
                  <span>Netralkan Layar</span>
                </button>
              )}
              {activeYoutubeEmbedUrl && (
                <button
                  type="button"
                  onClick={() => handleOpenFullScreen('video')}
                  className="px-2.5 py-1 rounded-md bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  title="Tonton siaran langsung dalam layar penuh di HP/Laptop"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>Layar Penuh HP</span>
                </button>
              )}
              {activeYoutubeUrl && (
                <a
                  href={activeYoutubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-amber-300 hover:underline flex items-center gap-1"
                >
                  <span>Buka YouTube</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          <div className="aspect-video w-full bg-black relative">
            {activeYoutubeEmbedUrl ? (
              <iframe
                title="Live Streaming Undian & Technical Meeting HAB ke-81"
                src={activeYoutubeEmbedUrl}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-2.5 bg-[#02140f]">
                <VideoOff className="w-9 h-9 text-slate-400" />
                <div className="text-xs sm:text-sm font-bold text-slate-200">
                  Tidak Ada Video / Siaran Live Saat Ini
                </div>
                <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                  Layar siaran dalam kondisi netral (standby). Tayangan YouTube Live hanya akan tampil pada layar ini saat Panitia sedang menyiarkan pengundian atau acara secara langsung.
                </p>
              </div>
            )}
          </div>

          {/* Admin YouTube Link Manager */}
          <div className="p-4 space-y-3 border-t border-emerald-800/70">
            {youtubeSavedNotice && (
              <div className="p-2.5 rounded-lg bg-emerald-900/90 border border-emerald-500/50 text-[11px] text-emerald-100">
                {youtubeSavedNotice}
              </div>
            )}

            {isAdminUnlocked ? (
              <form onSubmit={handleSaveYoutubeLiveUrl} className="space-y-3 text-xs">
                {galleryYoutubeVideos.length > 0 && (
                  <div>
                    <label className="block text-[11px] font-semibold text-amber-300 mb-1">
                      Ambil Link YouTube yang Sudah Tersimpan di Galeri Video:
                    </label>
                    <select
                      value={selectedGalleryVideoId}
                      onChange={(e) => handlePickGalleryVideo(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#021b15] border border-emerald-700 text-xs text-white"
                    >
                      <option value="">-- Pilih dari Galeri Video / Live Streaming --</option>
                      {galleryYoutubeVideos.map((v) => (
                        <option key={v.id} value={v.id}>
                          [{v.kategori}] {v.judul}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Atau Tempel / Copy Link YouTube Live Secara Langsung:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      value={youtubeInput}
                      onChange={(e) => setYoutubeInput(e.target.value)}
                      placeholder="https://www.youtube.com/live/... atau https://youtu.be/..."
                      className="flex-1 min-w-[180px] px-3 py-2 rounded-lg bg-[#021b15] border border-emerald-700 text-xs text-white font-mono-tabular"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs cursor-pointer shrink-0 whitespace-nowrap"
                    >
                      Tayangkan
                    </button>
                    <button
                      type="button"
                      onClick={handleNeutralizeLiveScreen}
                      className="px-3 py-2 rounded-lg bg-rose-950/90 hover:bg-rose-900 border border-rose-500/40 text-rose-200 font-semibold text-xs flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
                    >
                      <VideoOff className="w-3.5 h-3.5" />
                      <span>Netralkan Layar</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Tekan <strong>Netralkan Layar</strong> jika siaran live sudah selesai agar pengunjung tahu tidak ada video live yang sedang aktif.
                  </p>
                </div>
              </form>
            ) : (
              <div className="text-[11px] text-slate-300 flex items-center justify-between gap-2">
                <span>
                  Hasil undian di sebelah kanan ter-update otomatis tanpa perlu me-refresh halaman.
                </span>
                <button
                  type="button"
                  onClick={() => setShowPinPrompt(true)}
                  className="text-amber-300 hover:underline font-semibold shrink-0 cursor-pointer"
                >
                  Login Admin
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right 7 Cols: Mesin Undian Manual Operator (Admin) & Live Shuffling Display */}
        <div
          ref={operatorPanelRef}
          className="lg:col-span-7 bg-[#03251c] border border-emerald-800/80 rounded-2xl p-5 space-y-5 shadow-xl"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-800/70 pb-3">
            <div>
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <Shuffle className="w-4 h-4 text-amber-400" />
                <span>Panel Input &amp; Mesin Undian Manual (Operator)</span>
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                Ketik jenis lomba bebas dan daftar tim yang ikut diundi (1 baris = 1 tim/peserta).
              </p>
            </div>
            <span className="text-xs font-mono-tabular text-amber-300 font-bold">
              {parsedTeams.length} Tim/Peserta Siap Diundi
            </span>
          </div>

          {/* Live Rolling Animation Display during Shuffle */}
          {isSpinning && (
            <div className="p-5 rounded-2xl bg-[#021b15] border-2 border-amber-400 text-center space-y-3 shadow-inner">
              <div className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Mesin Undian Sedang Mengocok {judulLomba}...</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {rollingPreviewNames.map((name, i) => (
                  <div
                    key={i}
                    className="px-3 py-2 rounded-lg bg-[#043327] border border-amber-400/50 text-sm font-bold text-white truncate font-mono-tabular"
                  >
                    #{i + 1} · {name}
                  </div>
                ))}
              </div>
              <div className="pt-1 flex justify-center">
                <button
                  type="button"
                  onClick={handleAbortSpin}
                  className="px-4 py-1.5 rounded-lg bg-rose-950 hover:bg-rose-900 border border-rose-500/60 text-rose-100 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Batalkan Putaran</span>
                </button>
              </div>
            </div>
          )}

          {isAdminUnlocked ? (
            <div className="space-y-4">
              {/* Row 1: Free-text Event Title & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-8">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nama Jenis Olahraga / Lomba (Ketik Bebas) *
                  </label>
                  <input
                    type="text"
                    value={judulLomba}
                    onChange={(e) => setJudulLomba(e.target.value)}
                    placeholder="Contoh: Bola Voli Putra, Futsal Antar-KUA, Bulu Tangkis Ganda Putri, MTQ ASN..."
                    className="w-full px-3 py-2 rounded-lg bg-[#021b15] border border-emerald-700 text-xs text-white"
                  />
                </div>
                <div className="sm:col-span-4">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Kategori Induk
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['Olahraga', 'Lomba'] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setKategoriUtama(cat)}
                        className={`py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                          kategoriUtama === cat
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-[#021b15] text-slate-300 border border-emerald-700 hover:text-white'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 2: Draw Mode Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setDrawMode('pool')}
                  className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                    drawMode === 'pool'
                      ? 'bg-emerald-900/90 border-amber-400 text-white'
                      : 'bg-[#021b15] border-emerald-800 text-slate-300 hover:border-emerald-600'
                  }`}
                >
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>Undian Pool / Grup</span>
                  </div>
                  <div className="text-[11px] text-slate-300 mt-1">
                    Bagi rata ke Grup A, B, C, dst. (Turnamen Full Lomba)
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDrawMode('gugur')}
                  className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                    drawMode === 'gugur'
                      ? 'bg-emerald-900/90 border-amber-400 text-white'
                      : 'bg-[#021b15] border-emerald-800 text-slate-300 hover:border-emerald-600'
                  }`}
                >
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <GitBranch className="w-3.5 h-3.5" />
                    <span>Undian Sistem Gugur</span>
                  </div>
                  <div className="text-[11px] text-slate-300 mt-1">
                    Pasangkan Partai 1, 2, dst. (Otomatis BYE jika ganjil)
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDrawMode('nomor_urut')}
                  className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                    drawMode === 'nomor_urut'
                      ? 'bg-emerald-900/90 border-amber-400 text-white'
                      : 'bg-[#021b15] border-emerald-800 text-slate-300 hover:border-emerald-600'
                  }`}
                >
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <ListOrdered className="w-3.5 h-3.5" />
                    <span>Undian Nomor Urut</span>
                  </div>
                  <div className="text-[11px] text-slate-300 mt-1">
                    Acak urutan tampil #01, #02, #03, dst.
                  </div>
                </button>
              </div>

              {drawMode === 'pool' && (
                <div className="flex flex-wrap items-center gap-2 bg-[#021b15] border border-emerald-800/80 rounded-xl p-3">
                  <span className="text-xs font-semibold text-slate-200">
                    Jumlah Pembagian Pool / Grup:
                  </span>
                  {[2, 3, 4, 6, 8].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setJumlahPool(cnt)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold font-mono-tabular cursor-pointer ${
                        jumlahPool === cnt
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-[#03251c] text-slate-300 border border-emerald-700'
                      }`}
                    >
                      {cnt} Grup
                    </button>
                  ))}
                </div>
              )}

              {/* Optional Data Fetch Helpers */}
              <div className="bg-[#021b15] border border-emerald-800/80 rounded-xl p-3.5 space-y-2.5">
                <div className="text-[11px] font-bold text-amber-300">
                  Alat Bantu Ambil Data (Opsional — Tetap Bisa Diedit Manual di Kotak Bawah):
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label="Filter Sumber Pendaftar"
                    value={regSourceFilter}
                    onChange={(e) => setRegSourceFilter(e.target.value)}
                    className="flex-1 min-w-[180px] px-2.5 py-1.5 rounded-lg bg-[#03251c] border border-emerald-700 text-xs text-white"
                  >
                    <option value="ALL">Semua Pendaftar ({registrations.length})</option>
                    <option value="CAT_OLAHRAGA">Pendaftar Kategori Olahraga</option>
                    <option value="CAT_LOMBA">Pendaftar Kategori Lomba</option>
                    {competitions.map((c) => (
                      <option key={c.id} value={c.id}>
                        Cabang: {c.nama}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handlePullFromRegistrations}
                    className="px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                  >
                    Ambil Data Pendaftar
                  </button>
                  <button
                    type="button"
                    onClick={handlePullFromSatkers}
                    className="px-3 py-1.5 rounded-lg bg-[#03251c] hover:bg-emerald-900 border border-emerald-700 text-amber-200 text-xs font-semibold cursor-pointer whitespace-nowrap"
                  >
                    Ambil Daftar Satker ({satkerList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRawTeamsText('')}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-200 text-xs cursor-pointer whitespace-nowrap"
                  >
                    Kosongkan
                  </button>
                </div>
              </div>

              {/* Manual Teams Textarea */}
              <div>
                <label className="block text-xs font-semibold text-amber-300 mb-1">
                  Ketik / Tempel Daftar Tim / Peserta (1 Baris = 1 Tim/Peserta) *
                </label>
                <textarea
                  rows={6}
                  value={rawTeamsText}
                  onChange={(e) => setRawTeamsText(e.target.value)}
                  placeholder={
                    'Contoh ketik manual:\nKUA Kec. Ampana Kota\nKUA Kec. Ratolindo\nMAN Tojo Una-Una\nMTsN 1 Tojo Una-Una\nKemenag Induk Putra\nDWP Kemenag Touna'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#021b15] border border-emerald-700 text-xs text-white leading-relaxed font-mono-tabular"
                />
              </div>

              {/* Notes + Primary Spin Button */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
                <div className="flex-1">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Catatan Technical Meeting (Opsional)
                  </label>
                  <input
                    type="text"
                    value={catatanTm}
                    onChange={(e) => setCatatanTm(e.target.value)}
                    placeholder="Contoh: Disaksikan seluruh manajer kontingen di Aula Kemenag..."
                    className="w-full px-3 py-2 rounded-lg bg-[#021b15] border border-emerald-700 text-xs text-white"
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isSpinning && (
                    <button
                      type="button"
                      onClick={handleAbortSpin}
                      className="px-4 py-2.5 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-500/60 text-rose-100 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <X className="w-4 h-4" />
                      <span>Batalkan Putaran</span>
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isSpinning}
                    onClick={handleRunDrawMachine}
                    className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg whitespace-nowrap shrink-0"
                  >
                    {isSpinning ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Mengundi...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        <span>
                          {drawMode === 'nomor_urut'
                            ? 'Putar Mesin Undian Nomor Urut'
                            : 'Putar Mesin Undian Full Lomba'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-[#021b15] border border-emerald-800/80 text-center space-y-3">
              <Lock className="w-8 h-8 text-amber-400 mx-auto" />
              <div className="text-sm font-bold text-white">
                Mode Penonton Aktif — Pengoperasian Mesin Undian Khusus Admin
              </div>
              <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                Anda dapat menyaksikan siaran Live YouTube di sebelah kiri dan memantau hasil undian resmi di bawah secara Real-Time. Jika Anda Panitia Operator, buka kontrol dengan PIN Admin.
              </p>
              <button
                type="button"
                onClick={() => setShowPinPrompt(true)}
                className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Buka Mesin Undian (PIN Admin)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Real-Time Published Draw Results Board */}
      <div className="bg-[#03251c] border border-emerald-800/80 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-800/70 pb-3">
          <div>
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Papan Hasil Undian Resmi (Real-Time)</span>
            </h4>
            <p className="text-xs text-slate-300 mt-0.5">
              Setiap cabang yang selesai diundi langsung tampil permanen di sini untuk seluruh kontingen.
            </p>
          </div>

          {tournamentDraws.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {tournamentDraws.map((sess) => (
                <button
                  key={sess.id}
                  type="button"
                  onClick={() => setSelectedSessionId(sess.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                    activeSession?.id === sess.id
                      ? 'bg-amber-400 text-slate-950 font-bold'
                      : 'bg-[#021b15] text-slate-300 border border-emerald-800 hover:text-white'
                  }`}
                >
                  {sess.judulLomba}
                </button>
              ))}
            </div>
          )}
        </div>

        {!activeSession ? (
          <div className="p-8 text-center text-xs text-slate-300 bg-[#021b15] rounded-xl border border-emerald-800/70">
            Belum ada hasil undian yang dipublikasikan. Hasil pengundian dari Mesin Undian akan langsung muncul secara otomatis di sini.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Active Session Header & Action Buttons */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-xl bg-[#021b15] border border-emerald-800">
              <div>
                <div className="text-base font-bold text-white">{activeSession.judulLomba}</div>
                <div className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="text-amber-300 font-semibold">{activeSession.kategoriUtama}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {activeSession.mode === 'pool'
                      ? 'Mode Pool / Grup Turnamen'
                      : activeSession.mode === 'gugur'
                      ? 'Mode Bagan Sistem Gugur'
                      : 'Mode Nomor Urut Tampil'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">
                    {activeSession.pesertaInput.length} Tim/Peserta
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">{activeSession.waktuUndian}</span>
                </div>
                {activeSession.catatan && (
                  <p className="text-xs text-emerald-200 mt-1.5">
                    Catatan: {activeSession.catatan}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {isAdminUnlocked &&
                  (activeSession.mode === 'pool' || activeSession.mode === 'gugur') && (
                    <button
                      type="button"
                      onClick={() => handleSyncToScoreboard(activeSession)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <Trophy className="w-3.5 h-3.5 text-amber-300" />
                      <span>
                        {activeSession.syncedToScoreboard
                          ? 'Kirim Ulang ke Papan Skor'
                          : 'Kirim ke Papan Skor Live'}
                      </span>
                    </button>
                  )}

                <button
                  type="button"
                  onClick={() => void downloadTournamentDrawPdfReport(activeSession, branding)}
                  className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Berita Acara PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => void handleShareDrawToWa(activeSession)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Bagikan WA</span>
                </button>

                {isAdminUnlocked && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleCancelAndRepeatSession(activeSession)}
                      title="Batalkan hasil undian ini, bersihkan jadwal Papan Skor terkait, lalu muat ulang daftar tim ke editor untuk diundi ulang"
                      className="px-3 py-1.5 rounded-lg bg-amber-950/90 hover:bg-amber-900 border border-amber-400/50 text-amber-200 font-semibold text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Batalkan &amp; Ulangi</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSessionWithNotice(activeSession)}
                      title="Hapus permanen hasil undian ini beserta jadwal terkait di Papan Skor Live"
                      className="px-3 py-1.5 rounded-lg bg-rose-950/90 hover:bg-rose-900 border border-rose-500/40 text-rose-200 font-semibold text-xs flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Result Body by Mode */}
            {activeSession.mode === 'nomor_urut' && activeSession.nomorUrutResult && (
              <div className="overflow-x-auto rounded-xl border border-emerald-800/80">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#021b15] text-amber-300 border-b border-emerald-800">
                      <th className="py-2.5 px-4 font-bold w-32">No. Urut Tampil</th>
                      <th className="py-2.5 px-4 font-bold">Nama Peserta / Tim / Kontingen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-900/60 bg-[#021f18]">
                    {activeSession.nomorUrutResult.map((name, idx) => (
                      <tr key={`${idx}-${name}`} className="hover:bg-[#043327]/70">
                        <td className="py-2.5 px-4 font-mono-tabular font-bold text-amber-300">
                          Urut #{String(idx + 1).padStart(2, '0')}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-white">{name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeSession.mode === 'pool' && activeSession.poolGroups && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {activeSession.poolGroups.map((grp) => (
                  <div
                    key={grp.groupName}
                    className="rounded-xl bg-[#021b15] border border-emerald-800/90 overflow-hidden"
                  >
                    <div className="px-3.5 py-2.5 bg-emerald-900/70 border-b border-emerald-800 flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-300">{grp.groupName}</span>
                      <span className="text-[11px] font-mono-tabular text-emerald-200">
                        {grp.teams.length} Tim
                      </span>
                    </div>
                    <ol className="divide-y divide-emerald-900/60 text-xs">
                      {grp.teams.map((team, idx) => (
                        <li
                          key={`${grp.groupName}-${idx}`}
                          className="px-3.5 py-2 flex items-center gap-2 text-slate-100"
                        >
                          <span className="font-mono-tabular text-amber-300 font-bold w-5 shrink-0">
                            {idx + 1}.
                          </span>
                          <span className="font-medium truncate" title={team}>
                            {team}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            )}

            {activeSession.mode === 'gugur' && activeSession.knockoutMatches && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeSession.knockoutMatches.map((m) => (
                  <div
                    key={m.matchNumber}
                    className="p-3.5 rounded-xl bg-[#021b15] border border-emerald-800/90 space-y-2"
                  >
                    <div className="flex items-center justify-between text-[11px] text-amber-300 font-semibold">
                      <span className="font-mono-tabular">Partai #{m.matchNumber}</span>
                      <span>{m.roundLabel}</span>
                    </div>
                    <div className="grid grid-cols-11 items-center gap-2 text-xs">
                      <div className="col-span-5 px-2.5 py-2 rounded-lg bg-[#03251c] border border-emerald-800/70 font-bold text-white truncate">
                        {m.teamA}
                      </div>
                      <div className="col-span-1 text-center font-bold text-amber-400">
                        {m.isBye ? '—' : 'VS'}
                      </div>
                      <div
                        className={`col-span-5 px-2.5 py-2 rounded-lg border truncate ${
                          m.isBye
                            ? 'bg-emerald-950/60 border-amber-400/40 text-amber-300 font-semibold'
                            : 'bg-[#03251c] border-emerald-800/70 font-bold text-white'
                        }`}
                      >
                        {m.teamB}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile & Desktop Full-Screen Watch Overlay (Edge-to-Edge on Phone Screens) */}
      {fullScreenMode !== 'none' && (
        <div
          ref={fullScreenContainerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Layar Penuh Live Streaming & Hasil Undian HAB ke-81"
          className="fixed inset-0 z-50 w-screen h-[100dvh] bg-[#01120d] flex flex-col overflow-hidden"
        >
          {/* Compact Top Control Bar */}
          <div className="px-3 sm:px-4 py-2.5 bg-[#021b15] border-b border-emerald-800/80 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 text-xs font-bold text-white min-w-0">
              <Youtube className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="truncate">
                {activeSession ? activeSession.judulLomba : 'Live Streaming & Undian HAB ke-81'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setFullScreenMode('video')}
                className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold cursor-pointer ${
                  fullScreenMode === 'video'
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-[#03251c] text-slate-200 border border-emerald-700'
                }`}
              >
                Video Penuh
              </button>
              <button
                type="button"
                onClick={() => setFullScreenMode('split')}
                className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold cursor-pointer ${
                  fullScreenMode === 'split'
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-[#03251c] text-slate-200 border border-emerald-700'
                }`}
              >
                Live + Hasil
              </button>
              <button
                type="button"
                onClick={handleRequestBrowserFullscreen}
                className="hidden sm:inline-flex px-2.5 py-1.5 rounded-md bg-[#03251c] hover:bg-emerald-900 border border-emerald-700 text-amber-200 text-[11px] font-semibold items-center gap-1 cursor-pointer"
                title="Perluas ke Fullscreen Browser"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Fullscreen</span>
              </button>
              <button
                type="button"
                onClick={handleCloseFullScreen}
                className="px-2.5 py-1.5 rounded-md bg-rose-950 hover:bg-rose-900 border border-rose-500/50 text-rose-100 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Tutup</span>
              </button>
            </div>
          </div>

          {fullScreenMode === 'video' ? (
            <div className="flex-1 w-full bg-black flex items-center justify-center relative">
              {activeYoutubeEmbedUrl ? (
                <iframe
                  title="Layar Penuh Live Streaming HAB ke-81"
                  src={activeYoutubeEmbedUrl}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                  allowFullScreen
                />
              ) : (
                <div className="p-6 text-center space-y-3 text-xs text-slate-300">
                  <VideoOff className="w-10 h-10 text-slate-400 mx-auto" />
                  <p className="font-semibold text-slate-200">
                    Tidak ada siaran video live yang sedang aktif saat ini.
                  </p>
                  <button
                    type="button"
                    onClick={() => setFullScreenMode('split')}
                    className="px-4 py-2 rounded-lg bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    Lihat Papan Hasil Undian
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 overflow-hidden">
              {/* Top on HP / Left on Desktop: Sticky YouTube Live Player */}
              {activeYoutubeEmbedUrl && (
                <div className="lg:col-span-6 bg-black shrink-0 lg:h-full flex items-center justify-center border-b lg:border-b-0 lg:border-r border-emerald-800/80">
                  <div className="aspect-video w-full lg:h-full lg:aspect-auto">
                    <iframe
                      title="Live Streaming Undian HAB ke-81"
                      src={activeYoutubeEmbedUrl}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}

              {/* Bottom on HP / Right on Desktop: Real-Time Results & Spin Preview */}
              <div
                className={`${
                  activeYoutubeEmbedUrl ? 'lg:col-span-6' : 'lg:col-span-12'
                } flex-1 overflow-y-auto p-3 sm:p-5 space-y-4`}
              >
                {isSpinning && (
                  <div className="p-4 rounded-xl bg-[#021b15] border-2 border-amber-400 text-center space-y-2">
                    <div className="text-xs font-bold text-amber-300 flex items-center justify-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Mengocok {judulLomba}...</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {rollingPreviewNames.map((n, i) => (
                        <div
                          key={i}
                          className="px-2.5 py-1.5 rounded bg-[#043327] text-xs font-bold text-white truncate font-mono-tabular"
                        >
                          #{i + 1} · {n}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {tournamentDraws.length > 1 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tournamentDraws.map((sess) => (
                      <button
                        key={sess.id}
                        type="button"
                        onClick={() => setSelectedSessionId(sess.id)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer ${
                          activeSession?.id === sess.id
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-[#03251c] text-slate-200 border border-emerald-800'
                        }`}
                      >
                        {sess.judulLomba}
                      </button>
                    ))}
                  </div>
                )}

                {!activeSession ? (
                  <div className="p-6 text-center text-xs text-slate-300 bg-[#03251c] rounded-xl border border-emerald-800">
                    Menunggu hasil pengundian dari Panitia Operator...
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-[#03251c] border border-emerald-800">
                      <div className="text-sm font-bold text-white">{activeSession.judulLomba}</div>
                      <div className="text-[11px] text-amber-300 mt-0.5 font-mono-tabular">
                        {activeSession.kategoriUtama} · {activeSession.pesertaInput.length} Tim ·{' '}
                        {activeSession.waktuUndian}
                      </div>
                    </div>

                    {activeSession.mode === 'nomor_urut' && activeSession.nomorUrutResult && (
                      <div className="rounded-xl border border-emerald-800 overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <tbody className="divide-y divide-emerald-900/70 bg-[#021f18]">
                            {activeSession.nomorUrutResult.map((name, idx) => (
                              <tr key={`${idx}-${name}`}>
                                <td className="py-2 px-3 font-mono-tabular font-bold text-amber-300 w-24">
                                  Urut #{String(idx + 1).padStart(2, '0')}
                                </td>
                                <td className="py-2 px-3 font-semibold text-white">{name}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {activeSession.mode === 'pool' && activeSession.poolGroups && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {activeSession.poolGroups.map((grp) => (
                          <div
                            key={grp.groupName}
                            className="rounded-xl bg-[#03251c] border border-emerald-800 overflow-hidden"
                          >
                            <div className="px-3 py-2 bg-emerald-900/70 text-xs font-bold text-amber-300 flex justify-between">
                              <span>{grp.groupName}</span>
                              <span className="font-mono-tabular">{grp.teams.length} Tim</span>
                            </div>
                            <ol className="divide-y divide-emerald-900/60 text-xs">
                              {grp.teams.map((t, i) => (
                                <li key={i} className="px-3 py-1.5 text-white flex gap-2">
                                  <span className="text-amber-300 font-mono-tabular font-bold">
                                    {i + 1}.
                                  </span>
                                  <span className="truncate">{t}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeSession.mode === 'gugur' && activeSession.knockoutMatches && (
                      <div className="space-y-2">
                        {activeSession.knockoutMatches.map((m) => (
                          <div
                            key={m.matchNumber}
                            className="p-2.5 rounded-xl bg-[#03251c] border border-emerald-800 text-xs space-y-1"
                          >
                            <div className="text-[10px] font-bold text-amber-300 font-mono-tabular">
                              Partai #{m.matchNumber}
                            </div>
                            <div className="flex items-center gap-2 font-bold text-white">
                              <span className="flex-1 truncate">{m.teamA}</span>
                              <span className="text-amber-400 shrink-0">{m.isBye ? '—' : 'VS'}</span>
                              <span className="flex-1 truncate text-right text-emerald-200">
                                {m.teamB}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
