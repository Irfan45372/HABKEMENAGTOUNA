import React, { useEffect, useMemo, useState } from 'react';
import {
  Competition,
  MatchScore,
  MedalStanding,
  ParticipantFormat,
  ParticipantRegistration,
} from '../types/hab';
import {
  compressBannerImageFile,
  createRegistrationRecord,
  getRequiredPlayerSlots,
  normalizeCompetitionCategory,
  sortMedalStandings,
  validateRegistrationInput,
} from '../utils/habLogic';
import {
  downloadRegistrationsCsvReport,
  downloadRegistrationsPdfReport,
} from '../utils/pdfReportGenerator';
import { buildDeepLink, shareToWhatsAppWithFullImage } from '../utils/shareUtils';
import { InlinePdfCanvasViewer } from './InlinePdfCanvasViewer';
import { InlineWordDocViewer } from './InlineWordDocViewer';
import {
  Award,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  FileText,
  Filter,
  GitBranch,
  Image as ImageIcon,
  Lock,
  Maximize2,
  Minimize2,
  Plus,
  Search,
  Share2,
  Sparkles,
  Trash2,
  Trophy,
  Upload,
  UserPlus,
  Users,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

interface CompetitionSectionProps {
  competitions: Competition[];
  satkerList: string[];
  registrations: ParticipantRegistration[];
  matches: MatchScore[];
  medalStandings: MedalStanding[];
  allowCustomProposal: boolean;
  preselectedCompetitionId?: string | null;
  adminPin?: string;
  isAdminUnlocked?: boolean;
  onUnlockAdmin?: () => void;
  onUpdateCompetition?: (id: string, partial: Partial<Competition>) => void;
  onAddRegistration: (reg: ParticipantRegistration, newSatkerName?: string) => void;
}

export const CompetitionSection: React.FC<CompetitionSectionProps> = ({
  competitions,
  satkerList,
  registrations,
  matches,
  medalStandings,
  allowCustomProposal,
  preselectedCompetitionId,
  adminPin = '812027',
  isAdminUnlocked = false,
  onUnlockAdmin,
  onUpdateCompetition,
  onAddRegistration,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'form' | 'directory' | 'scoreboard' | 'medals' | 'bagan'
  >('form');

  // Strictly 2 main categories: 'Olahraga' and 'Lomba'
  const [selectedCategory, setSelectedCategory] = useState<'Semua' | 'Olahraga' | 'Lomba'>('Semua');
  const [formMainCategory, setFormMainCategory] = useState<'Olahraga' | 'Lomba'>(() =>
    normalizeCompetitionCategory(competitions[0]?.kategori)
  );
  const [selectedCompId, setSelectedCompId] = useState<string>(
    competitions[0]?.id || ''
  );
  const [isCustomProposal, setIsCustomProposal] = useState<boolean>(false);
  const [customCabangName, setCustomCabangName] = useState<string>(
    () => competitions[0]?.nama || ''
  );
  const [customFormat, setCustomFormat] = useState<ParticipantFormat>('Beregu/Tim');

  // Satker selection state
  const [selectedSatker, setSelectedSatker] = useState<string>(satkerList[0] || '');
  const [isCustomSatker, setIsCustomSatker] = useState<boolean>(false);
  const [customSatkerName, setCustomSatkerName] = useState<string>('');

  // Participant details
  const [namaTimAtauPeserta, setNamaTimAtauPeserta] = useState<string>('');
  const [ketuaAtauOfficial, setKetuaAtauOfficial] = useState<string>('');
  const [kontakWhatsapp, setKontakWhatsapp] = useState<string>('');
  const [nipAtauIdentitas, setNipAtauIdentitas] = useState<string>('');
  const [daftarPemain, setDaftarPemain] = useState<string[]>(['', '']);
  const [catatanTambahan, setCatatanTambahan] = useState<string>('');

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [activeJuknisComp, setActiveJuknisComp] = useState<Competition | null>(null);
  const [isEditingJuknisModal, setIsEditingJuknisModal] = useState<boolean>(false);
  const [showJuknisPinPrompt, setShowJuknisPinPrompt] = useState<boolean>(false);
  const [juknisPinInput, setJuknisPinInput] = useState<string>('');
  const [juknisPinError, setJuknisPinError] = useState<string | null>(null);
  const [editJuknisCatatan, setEditJuknisCatatan] = useState<string>('');
  const [editJuknisUrl, setEditJuknisUrl] = useState<string>('');
  const [editJuknisJadwal, setEditJuknisJadwal] = useState<string>('');
  const [editJuknisPic, setEditJuknisPic] = useState<string>('');
  const [juknisBannerMsg, setJuknisBannerMsg] = useState<string | null>(null);

  // Directory filters
  const [dirCategoryFilter, setDirCategoryFilter] = useState<'ALL' | 'Olahraga' | 'Lomba'>('ALL');
  const [dirCompFilter, setDirCompFilter] = useState<string>('ALL');
  const [dirSearch, setDirSearch] = useState<string>('');
  const [copiedCompId, setCopiedCompId] = useState<string | null>(null);

  // Bagan Pertandingan & Lomba (PDF / Word / JPG) state
  const [baganCategoryFilter, setBaganCategoryFilter] = useState<'Semua' | 'Olahraga' | 'Lomba'>('Semua');
  const [selectedBaganCompId, setSelectedBaganCompId] = useState<string>(
    () => competitions[0]?.id || ''
  );
  const [isEditingBagan, setIsEditingBagan] = useState<boolean>(false);
  const [showBaganPinPrompt, setShowBaganPinPrompt] = useState<boolean>(false);
  const [baganPinInput, setBaganPinInput] = useState<string>('');
  const [baganPinError, setBaganPinError] = useState<string | null>(null);
  const [editBaganUrl, setEditBaganUrl] = useState<string>('');
  const [editBaganFileName, setEditBaganFileName] = useState<string>('');
  const [editBaganFileType, setEditBaganFileType] = useState<'pdf' | 'word' | 'image' | 'link'>('pdf');
  const [editBaganCatatan, setEditBaganCatatan] = useState<string>('');
  const [baganNotice, setBaganNotice] = useState<string | null>(null);
  const [isUploadingBagan, setIsUploadingBagan] = useState<boolean>(false);
  const [baganFullscreen, setBaganFullscreen] = useState<boolean>(false);
  const [baganImageZoom, setBaganImageZoom] = useState<number>(100);

  const activeBaganComp = useMemo(
    () =>
      competitions.find((c) => c.id === selectedBaganCompId) ||
      competitions[0] ||
      null,
    [competitions, selectedBaganCompId]
  );

  const filteredCompetitionsForBagan = useMemo(() => {
    if (baganCategoryFilter === 'Semua') return competitions;
    return competitions.filter(
      (c) => normalizeCompetitionCategory(c.kategori) === baganCategoryFilter
    );
  }, [competitions, baganCategoryFilter]);

  const detectBaganFileType = (
    url?: string,
    explicitType?: 'pdf' | 'word' | 'image' | 'link',
    fileName?: string
  ): 'pdf' | 'word' | 'image' | 'link' => {
    if (explicitType) return explicitType;
    const raw = (url || '').toLowerCase();
    const fn = (fileName || '').toLowerCase();
    if (raw.startsWith('data:application/pdf') || fn.endsWith('.pdf') || raw.endsWith('.pdf')) {
      return 'pdf';
    }
    if (
      raw.includes('wordprocessingml') ||
      raw.includes('application/msword') ||
      fn.endsWith('.docx') ||
      fn.endsWith('.doc') ||
      raw.endsWith('.docx') ||
      raw.endsWith('.doc')
    ) {
      return 'word';
    }
    if (
      raw.startsWith('data:image/') ||
      /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(raw) ||
      /\.(jpg|jpeg|png|webp|gif)$/i.test(fn)
    ) {
      return 'image';
    }
    return 'link';
  };

  const openBaganEditorForComp = (comp: Competition) => {
    setEditBaganUrl(comp.baganUrl || '');
    setEditBaganFileName(
      comp.baganFileName || `Bagan-${comp.nama.replace(/\s+/g, '-')}`
    );
    setEditBaganFileType(
      detectBaganFileType(comp.baganUrl, comp.baganFileType, comp.baganFileName)
    );
    setEditBaganCatatan(comp.baganCatatan || '');
    setIsEditingBagan(true);
    setShowBaganPinPrompt(false);
    setBaganPinError(null);
  };

  const handleDownloadBaganFile = (comp: Competition) => {
    if (!comp.baganUrl) return;
    const fType = detectBaganFileType(comp.baganUrl, comp.baganFileType, comp.baganFileName);
    const defaultExt = fType === 'pdf' ? '.pdf' : fType === 'word' ? '.docx' : fType === 'image' ? '.jpg' : '';
    const safeName =
      comp.baganFileName ||
      `Bagan-${comp.nama.replace(/[^a-zA-Z0-9-_]/g, '-')}${defaultExt}`;
    const a = document.createElement('a');
    a.href = comp.baganUrl;
    a.download = safeName;
    if (!comp.baganUrl.startsWith('data:')) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShareBaganToWa = async (comp: Competition) => {
    const link = buildDeepLink({ lomba: comp.id, bagan: '1' });
    const fTypeLabel =
      comp.baganFileType === 'pdf'
        ? 'Dokumen PDF Resmi'
        : comp.baganFileType === 'word'
        ? 'Dokumen Word (.DOCX)'
        : comp.baganFileType === 'image'
        ? 'Gambar Bagan (.JPG/.PNG)'
        : 'Dokumen Bagan Resmi';
    const waText =
      `📊 *BAGAN PERTANDINGAN / LOMBA HAB KE-81 KEMENAG TOJO UNA-UNA*\n` +
      `*${comp.nama}* (${comp.kategori})\n\n` +
      `• *Format Peserta:* ${comp.jenisPeserta}\n` +
      `• *Jadwal Pelaksanaan:* ${comp.jadwalRingkas}\n` +
      `• *Koordinator / PIC:* ${comp.koordinator}\n` +
      `• *Format File Bagan:* ${fTypeLabel}\n` +
      (comp.baganCatatan ? `\n📌 *Keterangan Bagan:* ${comp.baganCatatan}\n` : '') +
      `\n🔗 *Lihat & Unduh Bagan Pertandingan/Lomba di Website:*\n${link}`;

    await shareToWhatsAppWithFullImage({
      title: `Bagan ${comp.nama} — HAB ke-81 Kemenag Touna`,
      waText,
      imageSrc:
        comp.baganUrl && comp.baganUrl.startsWith('data:image/')
          ? comp.baganUrl
          : '/Kementerian-Agama.png',
      fileName: `bagan-${comp.id}.jpg`,
    });
  };

  // Sync when external preselectedCompetitionId changes (e.g. from Map "Daftar" button)
  useEffect(() => {
    if (preselectedCompetitionId) {
      const exists = competitions.find((c) => c.id === preselectedCompetitionId);
      if (exists) {
        setIsCustomProposal(false);
        setSelectedCompId(exists.id);
        setSelectedBaganCompId(exists.id);
        setFormMainCategory(normalizeCompetitionCategory(exists.kategori));
        setCustomCabangName(exists.nama);
        setActiveSubTab('form');
      }
    }
  }, [preselectedCompetitionId, competitions]);

  // Check URL query parameter ?lomba=<id> or ?menu=lomba or ?bagan=1 when opened from WhatsApp
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const lombaParam = params.get('lomba');
      const menuParam = params.get('menu');
      const baganParam = params.get('bagan');
      if (lombaParam && competitions.length > 0) {
        const found = competitions.find((c) => c.id === lombaParam);
        if (found) {
          setIsCustomProposal(false);
          setSelectedCompId(found.id);
          setSelectedBaganCompId(found.id);
          setFormMainCategory(normalizeCompetitionCategory(found.kategori));
          setCustomCabangName(found.nama);
          if (baganParam === '1') {
            setActiveSubTab('bagan');
          } else {
            setActiveSubTab('form');
          }
          if (params.get('juknis') === '1') {
            setActiveJuknisComp(found);
          }
          const el = document.getElementById('pendaftaran-lomba');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }
      } else if (baganParam === '1') {
        setActiveSubTab('bagan');
        const el = document.getElementById('pendaftaran-lomba');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      } else if (menuParam === 'lomba') {
        const el = document.getElementById('pendaftaran-lomba');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
    } catch {
      // Ignore
    }
  }, [competitions]);

  const handleCopyCompLink = async (comp: Competition, includeJuknis = false) => {
    const link = buildDeepLink({
      lomba: comp.id,
      juknis: includeJuknis ? '1' : undefined,
    });
    try {
      await navigator.clipboard.writeText(link);
      setCopiedCompId(comp.id);
      window.setTimeout(() => setCopiedCompId(null), 3000);
    } catch {
      setCopiedCompId(comp.id);
    }
  };

  const handleShareCompToWa = async (comp: Competition) => {
    const link = buildDeepLink({ lomba: comp.id, juknis: '1' });
    const waText =
      `🏆 *PENDAFTARAN & JUKNIS LOMBA HAB KE-81 KEMENAG TOJO UNA-UNA*\n` +
      `_${comp.nama}_\n\n` +
      `• *Kategori:* ${comp.kategori}\n` +
      `• *Format Peserta:* ${comp.jenisPeserta} (Maks. ${comp.kuotaPemain} Orang)\n` +
      `• *Jadwal:* ${comp.jadwalRingkas}\n` +
      `• *Status Pendaftaran:* ${comp.statusPendaftaran}\n` +
      `• *Koordinator / PIC:* ${comp.koordinator}\n` +
      (comp.catatan ? `\n📋 *Juknis Singkat:* ${comp.catatan}\n` : '') +
      `\n🔗 *Buka Formulir Pendaftaran & Unduh Juknis Resmi:*\n${link}`;

    await shareToWhatsAppWithFullImage({
      title: `Lomba ${comp.nama} — HAB ke-81 Kemenag Touna`,
      waText,
      imageSrc: '/Kementerian-Agama.png',
      fileName: `lomba-${comp.id}.jpg`,
    });
  };

  const selectedCompetition = useMemo(
    () => competitions.find((c) => c.id === selectedCompId) || null,
    [competitions, selectedCompId]
  );

  // Dynamically adjust player input array length when competition format changes
  useEffect(() => {
    if (isCustomProposal) {
      if (customFormat === 'Perorangan/Individu') {
        setDaftarPemain((prev) => [prev[0] || '']);
      } else if (customFormat === 'Ganda') {
        setDaftarPemain((prev) => [prev[0] || '', prev[1] || '']);
      } else {
        setDaftarPemain((prev) =>
          prev.length >= 3 ? prev : [prev[0] || '', prev[1] || '', '']
        );
      }
      return;
    }

    if (!selectedCompetition) return;
    const slots = getRequiredPlayerSlots(selectedCompetition);
    if (selectedCompetition.jenisPeserta === 'Perorangan/Individu') {
      setDaftarPemain((prev) => [prev[0] || '']);
    } else if (selectedCompetition.jenisPeserta === 'Ganda') {
      setDaftarPemain((prev) => [prev[0] || '', prev[1] || '']);
    } else {
      // Beregu/Tim: start with 4 fields or preserve existing up to maxPlayers
      setDaftarPemain((prev) => {
        const initialCount = Math.min(slots.maxPlayers, Math.max(3, prev.length));
        const next = Array.from({ length: initialCount }, (_, i) => prev[i] || '');
        return next;
      });
    }
  }, [selectedCompetition, isCustomProposal, customFormat]);

  // Auto-sync individual name with first player slot for Perorangan
  const activeFormat: ParticipantFormat = isCustomProposal
    ? customFormat
    : selectedCompetition?.jenisPeserta || 'Perorangan/Individu';

  const maxAllowedPlayers = isCustomProposal
    ? customFormat === 'Perorangan/Individu'
      ? 1
      : customFormat === 'Ganda'
      ? 2
      : 12
    : selectedCompetition
    ? getRequiredPlayerSlots(selectedCompetition).maxPlayers
    : 10;

  const filteredCompetitionsForSelector = useMemo(() => {
    if (selectedCategory === 'Semua') return competitions;
    return competitions.filter(
      (c) => normalizeCompetitionCategory(c.kategori) === selectedCategory
    );
  }, [competitions, selectedCategory]);

  const competitionsInFormCategory = useMemo(() => {
    return competitions.filter(
      (c) => normalizeCompetitionCategory(c.kategori) === formMainCategory
    );
  }, [competitions, formMainCategory]);

  const handleSelectMainCategoryInForm = (cat: 'Olahraga' | 'Lomba') => {
    setFormMainCategory(cat);
    setSelectedCategory(cat);
    const matching = competitions.filter(
      (c) => normalizeCompetitionCategory(c.kategori) === cat
    );
    if (!isCustomProposal && matching.length > 0) {
      setSelectedCompId(matching[0].id);
      setCustomCabangName(matching[0].nama);
    } else if (isCustomProposal) {
      setCustomCabangName('');
    }
  };

  const handlePlayerNameChange = (idx: number, value: string) => {
    setDaftarPemain((prev) => {
      const copy = [...prev];
      copy[idx] = value;
      return copy;
    });
    if (activeFormat === 'Perorangan/Individu' && idx === 0) {
      setNamaTimAtauPeserta(value);
    }
  };

  const handleAddPlayerSlot = () => {
    if (daftarPemain.length < maxAllowedPlayers) {
      setDaftarPemain((prev) => [...prev, '']);
    }
  };

  const handleRemovePlayerSlot = (idx: number) => {
    if (daftarPemain.length > 1) {
      setDaftarPemain((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  const handleSubmitRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const finalSatker = isCustomSatker ? customSatkerName.trim() : selectedSatker;
    const effectiveTeamOrPersonName =
      activeFormat === 'Perorangan/Individu'
        ? (daftarPemain[0] || namaTimAtauPeserta).trim()
        : namaTimAtauPeserta.trim();

    const validation = validateRegistrationInput({
      competition: selectedCompetition,
      isCustomProposal,
      customCabangName,
      satker: finalSatker,
      namaTimAtauPeserta: effectiveTeamOrPersonName,
      ketuaAtauOfficial:
        activeFormat === 'Perorangan/Individu'
          ? effectiveTeamOrPersonName
          : ketuaAtauOfficial,
      kontakWhatsapp,
      daftarPemain,
    });

    if (!validation.valid) {
      setFormError(validation.error || 'Mohon lengkapi seluruh kolom wajib.');
      return;
    }

    const newRecord = createRegistrationRecord({
      id: `reg-${Date.now()}`,
      competition: selectedCompetition,
      selectedMainCategory: formMainCategory,
      isCustomProposal,
      customCabangName: customCabangName.trim() || selectedCompetition?.nama || '',
      customFormat,
      satker: finalSatker,
      namaTimAtauPeserta: effectiveTeamOrPersonName,
      ketuaAtauOfficial,
      kontakWhatsapp,
      nipAtauIdentitas,
      daftarPemain,
      catatanTambahan,
    });

    onAddRegistration(
      newRecord,
      isCustomSatker && finalSatker ? finalSatker : undefined
    );

    setFormSuccess(
      `Pendaftaran "${newRecord.namaTimAtauPeserta}" (${newRecord.satker}) pada Kategori ${newRecord.kategori} — ${newRecord.competitionName} berhasil disimpan!`
    );
    setNamaTimAtauPeserta('');
    setKetuaAtauOfficial('');
    setKontakWhatsapp('');
    setNipAtauIdentitas('');
    setCatatanTambahan('');
    if (isCustomProposal) {
      setCustomCabangName('');
    } else if (selectedCompetition) {
      setCustomCabangName(selectedCompetition.nama);
    }
    setDaftarPemain(
      activeFormat === 'Perorangan/Individu'
        ? ['']
        : activeFormat === 'Ganda'
        ? ['', '']
        : ['', '', '']
    );
  };

  const getRegMainCategory = (reg: ParticipantRegistration): 'Olahraga' | 'Lomba' => {
    if (reg.kategori) {
      return normalizeCompetitionCategory(reg.kategori);
    }
    const foundComp = competitions.find((c) => c.id === reg.competitionId);
    if (foundComp?.kategori) {
      return normalizeCompetitionCategory(foundComp.kategori);
    }
    return normalizeCompetitionCategory(reg.competitionName);
  };

  const baseFilteredRegistrations = useMemo(() => {
    return registrations.filter((r) => {
      const matchesComp =
        dirCompFilter === 'ALL' || r.competitionId === dirCompFilter;
      const q = dirSearch.trim().toLowerCase();
      const matchesQuery =
        !q ||
        r.namaTimAtauPeserta.toLowerCase().includes(q) ||
        r.satker.toLowerCase().includes(q) ||
        r.competitionName.toLowerCase().includes(q) ||
        r.daftarPemain.some((p) => p.toLowerCase().includes(q));
      return matchesComp && matchesQuery;
    });
  }, [registrations, dirCompFilter, dirSearch]);

  const olahragaRegistrations = useMemo(
    () => baseFilteredRegistrations.filter((r) => getRegMainCategory(r) === 'Olahraga'),
    [baseFilteredRegistrations, competitions]
  );

  const lombaRegistrations = useMemo(
    () => baseFilteredRegistrations.filter((r) => getRegMainCategory(r) === 'Lomba'),
    [baseFilteredRegistrations, competitions]
  );

  const filteredRegistrations = useMemo(() => {
    if (dirCategoryFilter === 'Olahraga') return olahragaRegistrations;
    if (dirCategoryFilter === 'Lomba') return lombaRegistrations;
    return baseFilteredRegistrations;
  }, [baseFilteredRegistrations, olahragaRegistrations, lombaRegistrations, dirCategoryFilter]);

  const sortedMedals = useMemo(
    () => sortMedalStandings(medalStandings),
    [medalStandings]
  );

  return (
    <section
      id="pendaftaran-lomba"
      aria-label="Sistem Pendaftaran Lomba Fleksibel, Direktori Peserta & Klasemen"
      className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-emerald-900/70"
    >
      {/* Header & Sub-Navigation Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold text-amber-300 tracking-wide mb-1">
            02. Porseni, Seni Budaya, Keagamaan & Ekshibisi HAB ke-81
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white [text-wrap:balance]">
            Sistem Pendaftaran Lomba Fleksibel & Klasemen Kontingen
          </h2>
          <p className="text-sm text-slate-300 mt-1.5 max-w-2xl">
            Formulir otomatis menyesuaikan jumlah atlet/peserta berdasarkan jenis lomba (Perorangan, Ganda, atau Beregu/Tim), dilengkapi Bagan Pertandingan & Lomba (PDF/Word/JPG).
          </p>
        </div>

        {/* Interactive Module Switcher (5 Tabs) */}
        <div
          role="tablist"
          aria-label="Menu Modul Perlombaan"
          className="flex flex-wrap items-center gap-1.5 bg-[#03221a] p-1.5 rounded-xl border border-emerald-800/80 self-start"
        >
          <button
            role="tab"
            aria-selected={activeSubTab === 'form'}
            type="button"
            onClick={() => setActiveSubTab('form')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeSubTab === 'form'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Formulir Pendaftaran</span>
          </button>
          <button
            role="tab"
            aria-selected={activeSubTab === 'directory'}
            type="button"
            onClick={() => setActiveSubTab('directory')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeSubTab === 'directory'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Direktori Terdaftar ({registrations.length})</span>
          </button>
          <button
            role="tab"
            aria-selected={activeSubTab === 'scoreboard'}
            type="button"
            onClick={() => setActiveSubTab('scoreboard')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeSubTab === 'scoreboard'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Papan Skor ({matches.length})</span>
          </button>
          <button
            role="tab"
            aria-selected={activeSubTab === 'medals'}
            type="button"
            onClick={() => setActiveSubTab('medals')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeSubTab === 'medals'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Klasemen Medali</span>
          </button>
          <button
            role="tab"
            aria-selected={activeSubTab === 'bagan'}
            type="button"
            onClick={() => {
              if (!selectedBaganCompId && competitions[0]?.id) {
                setSelectedBaganCompId(competitions[0].id);
              }
              setActiveSubTab('bagan');
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeSubTab === 'bagan'
                ? 'bg-amber-400 text-slate-950 shadow-sm font-bold'
                : 'text-amber-200 hover:text-white bg-emerald-950/80 border border-amber-400/30'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Bagan Lomba / Pertandingan (PDF/Word/JPG)</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: DYNAMIC REGISTRATION FORM & COMPETITION CATALOG */}
      {activeSubTab === 'form' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 5 Cols: Dynamic Competition Selector Catalog */}
          <div className="lg:col-span-5 bg-[#03251c] border border-emerald-800/80 rounded-2xl p-5 space-y-4 max-h-[580px] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-emerald-800/70 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  Pilih Cabang Lomba ({competitions.length})
                </h3>
                <p className="text-xs text-slate-300">
                  Klik cabang lomba untuk memuat struktur formulir peserta
                </p>
              </div>
            </div>

            {/* 2 Main Category Filter Buttons */}
            <div className="flex flex-wrap gap-1.5">
              {(['Semua', 'Olahraga', 'Lomba'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat);
                    if (cat === 'Olahraga' || cat === 'Lomba') {
                      handleSelectMainCategoryInForm(cat);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-amber-400 text-slate-950 shadow-sm'
                      : 'bg-[#021b15] text-slate-300 hover:text-white border border-emerald-800/70'
                  }`}
                >
                  {cat === 'Semua' ? 'Semua Kategori' : `Kategori ${cat}`}
                </button>
              ))}
            </div>

            {/* Competition Cards List */}
            <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
              {filteredCompetitionsForSelector.map((comp) => {
                const isSelected = !isCustomProposal && selectedCompId === comp.id;
                const isClosed = comp.statusPendaftaran === 'Tutup';
                const normCat = normalizeCompetitionCategory(comp.kategori);
                return (
                  <div
                    key={comp.id}
                    onClick={() => {
                      setIsCustomProposal(false);
                      setSelectedCompId(comp.id);
                      setFormMainCategory(normCat);
                      setCustomCabangName(comp.nama);
                    }}
                    className={`p-3.5 rounded-xl border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-900/75 border-amber-400 shadow-md'
                        : 'bg-[#021b15]/90 border-emerald-800/70 hover:border-emerald-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold text-white leading-snug">
                        {comp.nama}
                      </h4>
                      <span
                        className={`text-[11px] font-semibold shrink-0 ${
                          isClosed ? 'text-rose-400' : 'text-emerald-300'
                        }`}
                      >
                        Status: {comp.statusPendaftaran}
                      </span>
                    </div>

                    {/* Clean Unboxed Metadata Line */}
                    <div className="text-xs text-slate-300 mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="text-amber-300 font-semibold">Kategori {normCat}</span>
                      <span aria-hidden="true">·</span>
                      <span>{comp.jenisPeserta}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">Maks. {comp.kuotaPemain} Orang</span>
                      <span aria-hidden="true">·</span>
                      <span>{comp.jadwalRingkas}</span>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-emerald-800/50 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-slate-400 truncate">
                        PIC: {comp.koordinator}
                      </span>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleShareCompToWa(comp);
                          }}
                          className="px-2.5 py-0.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                          title="Bagikan Info & Link Pendaftaran Lomba ke WhatsApp"
                        >
                          <Share2 className="w-3 h-3" />
                          <span>Bagikan WA</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBaganCompId(comp.id);
                            setActiveSubTab('bagan');
                          }}
                          className="px-2 py-0.5 rounded bg-[#03251c] hover:bg-emerald-800 border border-amber-400/40 text-amber-200 text-[11px] font-semibold inline-flex items-center gap-1 shrink-0 cursor-pointer"
                          title="Lihat atau Upload Bagan Pertandingan / Lomba (PDF, Word, JPG)"
                        >
                          <GitBranch className="w-3 h-3 text-amber-300" />
                          <span>{comp.baganUrl ? 'Lihat Bagan' : 'Bagan'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveJuknisComp(comp);
                          }}
                          className="text-amber-300 hover:text-amber-200 underline underline-offset-4 font-medium inline-flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Lihat Juknis</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Optional Custom Competition Proposal Button if enabled by Admin */}
              {allowCustomProposal && (
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomProposal(true);
                    setCustomCabangName('');
                  }}
                  className={`w-full p-3.5 rounded-xl border text-left transition-colors cursor-pointer flex items-center justify-between ${
                    isCustomProposal
                      ? 'bg-amber-400/15 border-amber-400 text-amber-200'
                      : 'bg-[#021b15]/70 border-dashed border-emerald-700 text-slate-300 hover:text-white'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold flex items-center gap-1.5 text-amber-300">
                      <Sparkles className="w-3.5 h-3.5" />
                      Input / Ketik Pilihan Olahraga atau Lomba Lainnya
                    </div>
                    <div className="text-[11px] text-slate-300 mt-0.5">
                      Ketik manual nama cabang Olahraga atau Lomba yang diikuti kontingen Anda
                    </div>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Right 7 Cols: Dynamic Registration Form (Bounded Scroll so page is never too long) */}
          <form
            onSubmit={handleSubmitRegistration}
            className="lg:col-span-7 bg-[#03251c] border border-emerald-800/80 rounded-2xl p-6 space-y-5 max-h-[580px] overflow-y-auto"
          >
            <div className="border-b border-emerald-800/70 pb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs text-amber-300 font-semibold">
                  Formulir Pendaftaran Resmi Kontingen HAB ke-81 ({ `Kategori ${formMainCategory}` })
                </div>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  {customCabangName.trim()
                    ? customCabangName
                    : isCustomProposal
                    ? `Input ${formMainCategory} Baru`
                    : selectedCompetition?.nama || `Pilih ${formMainCategory}`}
                </h3>
              </div>
              <div className="text-xs text-emerald-300 font-mono-tabular">
                Format: {activeFormat} (Maks. {maxAllowedPlayers} Peserta)
              </div>
            </div>

            {formError && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-rose-950/90 border border-rose-500/60 text-xs text-rose-200 font-medium"
              >
                {formError}
              </div>
            )}

            {formSuccess && (
              <div
                role="status"
                className="p-3.5 rounded-xl bg-emerald-900/90 border border-emerald-400/60 text-xs text-emerald-100 font-medium flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('directory')}
                  className="px-2.5 py-1 rounded bg-amber-400 text-slate-950 font-semibold whitespace-nowrap cursor-pointer"
                >
                  Lihat Direktori
                </button>
              </div>
            )}

            {/* STEP 1 & 2: PILIH KATEGORI (OLAHRAGA / LOMBA) & INPUT PILIHAN OLAHRAGA / LOMBA APA */}
            <div className="p-4 rounded-xl bg-[#021b15] border border-emerald-700/80 space-y-4">
              {/* 1. Pilih Kategori (Hanya 2 Kategori: Olahraga atau Lomba) */}
              <div>
                <label className="block text-xs font-bold text-amber-300 mb-2">
                  1. Pilih Kategori Pendaftaran (Olahraga atau Lomba) *
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {(['Olahraga', 'Lomba'] as const).map((cat) => {
                    const active = formMainCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleSelectMainCategoryInForm(cat)}
                        className={`py-2.5 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          active
                            ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md'
                            : 'bg-[#03251c] text-slate-200 border-emerald-800 hover:border-emerald-600'
                        }`}
                      >
                        <Trophy className="w-4 h-4" />
                        <span>Kategori {cat}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Pilih dari Daftar atau Ketik Input Pilihan Olahraga / Lomba Apa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-emerald-800/60">
                <div>
                  <label
                    htmlFor="form-comp-select"
                    className="block text-xs font-semibold text-slate-200 mb-1.5"
                  >
                    2. Pilih Daftar {formMainCategory} Tersedia *
                  </label>
                  <select
                    id="form-comp-select"
                    value={isCustomProposal ? '__CUSTOM__' : selectedCompId}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '__CUSTOM__') {
                        setIsCustomProposal(true);
                        setCustomCabangName('');
                      } else {
                        setIsCustomProposal(false);
                        setSelectedCompId(val);
                        const found = competitions.find((c) => c.id === val);
                        if (found) {
                          setCustomCabangName(found.nama);
                        }
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#03251c] border border-emerald-700 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400"
                  >
                    {competitionsInFormCategory.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nama} ({c.jenisPeserta})
                      </option>
                    ))}
                    <option value="__CUSTOM__">
                      + Ketik Sendiri / Pilihan {formMainCategory} Lainnya...
                    </option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="custom-cabang-input"
                    className="block text-xs font-semibold text-amber-200 mb-1.5"
                  >
                    3. Input Pilihan {formMainCategory} Apa yang Diikuti *
                  </label>
                  <input
                    id="custom-cabang-input"
                    type="text"
                    value={customCabangName}
                    onChange={(e) => setCustomCabangName(e.target.value)}
                    placeholder={
                      formMainCategory === 'Olahraga'
                        ? 'Ketik olahraga apa (mis: Bola Voli Putra, Futsal, Bulu Tangkis...)'
                        : 'Ketik lomba apa (mis: Paduan Suara, Qasidah, MTQ, Kuliner...)'
                    }
                    className="w-full px-3.5 py-2 rounded-lg bg-[#03251c] border border-amber-400/70 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {isCustomProposal && (
                <div className="pt-2 border-t border-emerald-800/60">
                  <label
                    htmlFor="custom-format-select"
                    className="block text-xs font-semibold text-amber-200 mb-1.5"
                  >
                    Format Kepesertaan ({formMainCategory}) *
                  </label>
                  <select
                    id="custom-format-select"
                    value={customFormat}
                    onChange={(e) => setCustomFormat(e.target.value as ParticipantFormat)}
                    className="w-full sm:w-1/2 px-3.5 py-2 rounded-lg bg-[#03251c] border border-emerald-700 text-sm text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="Perorangan/Individu">Perorangan/Individu (1 Orang)</option>
                    <option value="Ganda">Ganda (2 Pemain)</option>
                    <option value="Beregu/Tim">Beregu/Tim (Regu/Kelompok)</option>
                  </select>
                </div>
              )}
            </div>

            {/* Dynamic Satker / Kontingen Selector */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="satker-select"
                  className="block text-xs font-semibold text-slate-200"
                >
                  Satuan Kerja (Satker) / Kontingen Pengirim *
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomSatker((prev) => !prev)}
                  className="text-xs text-amber-300 hover:text-amber-200 underline underline-offset-4 cursor-pointer"
                >
                  {isCustomSatker
                    ? 'Pilih dari Daftar Satker Terdaftar'
                    : '+ Ketik Nama Kontingen Baru'}
                </button>
              </div>

              {!isCustomSatker ? (
                <select
                  id="satker-select"
                  value={selectedSatker}
                  onChange={(e) => setSelectedSatker(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#021b15] border border-emerald-700/80 text-sm text-white focus:outline-none focus:border-amber-400"
                >
                  {satkerList.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="satker-custom-input"
                  type="text"
                  value={customSatkerName}
                  onChange={(e) => setCustomSatkerName(e.target.value)}
                  placeholder="Ketik nama KUA / Madrasah / Pondok Pesantren / Instansi..."
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#021b15] border border-amber-400/70 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              )}
            </div>

            {/* Dynamic Team / Official vs Individual Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeFormat !== 'Perorangan/Individu' && (
                <div>
                  <label
                    htmlFor="reg-team-name"
                    className="block text-xs font-semibold text-slate-200 mb-1.5"
                  >
                    Nama Tim / Regu / Pasangan Ganda *
                  </label>
                  <input
                    id="reg-team-name"
                    type="text"
                    value={namaTimAtauPeserta}
                    onChange={(e) => setNamaTimAtauPeserta(e.target.value)}
                    placeholder="Contoh: Tim Voli Putra KUA Ratolindo"
                    className="w-full px-3.5 py-2 rounded-lg bg-[#021b15] border border-emerald-700/80 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              )}

              {activeFormat !== 'Perorangan/Individu' && (
                <div>
                  <label
                    htmlFor="reg-official-name"
                    className="block text-xs font-semibold text-slate-200 mb-1.5"
                  >
                    Nama Official / Manajer Kontingen *
                  </label>
                  <input
                    id="reg-official-name"
                    type="text"
                    value={ketuaAtauOfficial}
                    onChange={(e) => setKetuaAtauOfficial(e.target.value)}
                    placeholder="Nama penanggung jawab tim"
                    className="w-full px-3.5 py-2 rounded-lg bg-[#021b15] border border-emerald-700/80 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="reg-whatsapp"
                  className="block text-xs font-semibold text-slate-200 mb-1.5"
                >
                  Nomor WhatsApp Aktif (Koordinasi Jadwal) *
                </label>
                <input
                  id="reg-whatsapp"
                  type="tel"
                  value={kontakWhatsapp}
                  onChange={(e) => setKontakWhatsapp(e.target.value)}
                  placeholder="Contoh: 081241008127"
                  className="w-full px-3.5 py-2 rounded-lg bg-[#021b15] border border-emerald-700/80 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label
                  htmlFor="reg-nip"
                  className="block text-xs font-semibold text-slate-200 mb-1.5"
                >
                  NIP / NIK Ketua Tim atau Peserta
                </label>
                <input
                  id="reg-nip"
                  type="text"
                  value={nipAtauIdentitas}
                  onChange={(e) => setNipAtauIdentitas(e.target.value)}
                  placeholder="Contoh: 198501012010011001"
                  className="w-full px-3.5 py-2 rounded-lg bg-[#021b15] border border-emerald-700/80 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Dynamic Player / Member Input Slots */}
            <div className="space-y-2.5 pt-2 border-t border-emerald-800/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-300">
                  {activeFormat === 'Perorangan/Individu'
                    ? 'Data Peserta Perorangan *'
                    : activeFormat === 'Ganda'
                    ? 'Daftar Nama Pasangan Pemain Ganda (2 Orang) *'
                    : `Daftar Nama Anggota Regu / Tim (Maks. ${maxAllowedPlayers} Orang) *`}
                </span>
                {activeFormat === 'Beregu/Tim' &&
                  daftarPemain.length < maxAllowedPlayers && (
                    <button
                      type="button"
                      onClick={handleAddPlayerSlot}
                      className="px-2.5 py-1 rounded bg-emerald-800 hover:bg-emerald-700 text-xs text-amber-200 font-medium inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Tambah Kolom Pemain ({daftarPemain.length}/{maxAllowedPlayers})
                    </button>
                  )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
                {daftarPemain.map((playerValue, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <input
                      type="text"
                      aria-label={`Nama Peserta atau Pemain ${idx + 1}`}
                      value={playerValue}
                      onChange={(e) => handlePlayerNameChange(idx, e.target.value)}
                      placeholder={
                        activeFormat === 'Perorangan/Individu'
                          ? 'Nama Lengkap Peserta beserta Gelar'
                          : `Nama Pemain / Anggota #${idx + 1}`
                      }
                      className="w-full px-3 py-2 rounded-lg bg-[#021b15] border border-emerald-700/80 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                    {activeFormat === 'Beregu/Tim' && daftarPemain.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePlayerSlot(idx)}
                        aria-label={`Hapus Pemain ${idx + 1}`}
                        className="p-2 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="reg-notes"
                className="block text-xs font-semibold text-slate-200 mb-1.5"
              >
                Catatan Kontingen / Keterangan Tambahan (Opsional)
              </label>
              <input
                id="reg-notes"
                type="text"
                value={catatanTambahan}
                onChange={(e) => setCatatanTambahan(e.target.value)}
                placeholder="Contoh: Kontingen tiba dari Pulau Wakai H-1 pertandingan"
                className="w-full px-3.5 py-2 rounded-lg bg-[#021b15] border border-emerald-700/80 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-400">
                Data pendaftaran langsung tercatat di Direktori Resmi Panitia HAB ke-81.
              </p>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm transition-colors cursor-pointer whitespace-nowrap shadow-md"
              >
                Kirim & Simpan Pendaftaran Lomba
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUB-TAB 2: REGISTERED PARTICIPANTS DIRECTORY (CATEGORIZED OLAHRAGA & LOMBA + SEPARATE PDF DOWNLOADS) */}
      {activeSubTab === 'directory' && (
        <div className="bg-[#03251c] border border-emerald-800/80 rounded-2xl p-6 space-y-5 max-h-[620px] overflow-y-auto">
          <div className="flex flex-col gap-4 border-b border-emerald-800/70 pb-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Direktori Kontingen & Peserta Terdaftar — Kategori Olahraga & Lomba ({filteredRegistrations.length})
                </h3>
                <p className="text-xs text-slate-300">
                  Dikelompokkan berdasarkan Kategori Olahraga ({olahragaRegistrations.length}) dan Kategori Lomba ({lombaRegistrations.length}) beserta unduhan laporan PDF masing-masing
                </p>
              </div>

              {/* Search & Branch Filter */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    aria-label="Cari kontingen atau peserta"
                    value={dirSearch}
                    onChange={(e) => setDirSearch(e.target.value)}
                    placeholder="Cari nama tim, atlet, KUA..."
                    className="pl-9 pr-3.5 py-2 rounded-lg bg-[#021b15] border border-emerald-700/80 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-amber-400" />
                  <select
                    aria-label="Filter cabang lomba"
                    value={dirCompFilter}
                    onChange={(e) => setDirCompFilter(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-[#021b15] border border-emerald-700/80 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="ALL">Semua Cabang Olahraga & Lomba</option>
                    {competitions.map((c) => (
                      <option key={c.id} value={c.id}>
                        [{normalizeCompetitionCategory(c.kategori)}] {c.nama}
                      </option>
                    ))}
                    <option value="custom-proposal">Usulan Cabang Baru</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Category Filter Pills + Dedicated PDF Download Buttons for Olahraga & Lomba */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 border-t border-emerald-800/50">
              {/* Category Tabs: Semua, Kategori Olahraga, Kategori Lomba */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: 'ALL', label: `Semua Kategori (${baseFilteredRegistrations.length})` },
                    { id: 'Olahraga', label: `Kategori Olahraga (${olahragaRegistrations.length})` },
                    { id: 'Lomba', label: `Kategori Lomba (${lombaRegistrations.length})` },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDirCategoryFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      dirCategoryFilter === tab.id
                        ? 'bg-amber-400 text-slate-950 shadow-sm'
                        : 'bg-[#021b15] text-slate-300 hover:text-white border border-emerald-800/80'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Dedicated PDF Download Buttons for Olahraga, Lomba, and All */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const compSubLabel =
                      dirCompFilter === 'ALL'
                        ? 'Semua Cabang Olahraga'
                        : competitions.find((c) => c.id === dirCompFilter)?.nama || 'Cabang Olahraga';
                    void downloadRegistrationsPdfReport(
                      olahragaRegistrations,
                      undefined,
                      `Kategori Olahraga — ${compSubLabel}`
                    );
                  }}
                  className="px-3.5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="Unduh Laporan Resmi PDF Khusus Peserta Kategori Olahraga"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Unduh PDF Olahraga ({olahragaRegistrations.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const compSubLabel =
                      dirCompFilter === 'ALL'
                        ? 'Semua Cabang Lomba'
                        : competitions.find((c) => c.id === dirCompFilter)?.nama || 'Cabang Lomba';
                    void downloadRegistrationsPdfReport(
                      lombaRegistrations,
                      undefined,
                      `Kategori Lomba — ${compSubLabel}`
                    );
                  }}
                  className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="Unduh Laporan Resmi PDF Khusus Peserta Kategori Lomba"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Unduh PDF Lomba ({lombaRegistrations.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const label =
                      dirCompFilter === 'ALL'
                        ? 'Semua Kategori (Olahraga & Lomba)'
                        : dirCompFilter === 'custom-proposal'
                        ? 'Usulan Cabang Baru'
                        : competitions.find((c) => c.id === dirCompFilter)?.nama || 'Cabang Terpilih';
                    void downloadRegistrationsPdfReport(
                      baseFilteredRegistrations,
                      undefined,
                      label
                    );
                  }}
                  className="px-3 py-2 rounded-lg bg-[#021b15] hover:bg-emerald-900 border border-amber-400/50 text-amber-200 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                  title="Unduh Laporan Gabungan Semua Kategori ke Format PDF"
                >
                  <Download className="w-3.5 h-3.5 text-amber-300" />
                  <span>Unduh Semua PDF ({baseFilteredRegistrations.length})</span>
                </button>

                {isAdminUnlocked && (
                  <button
                    type="button"
                    onClick={() => {
                      const label =
                        dirCategoryFilter === 'Olahraga'
                          ? 'Kategori Olahraga'
                          : dirCategoryFilter === 'Lomba'
                          ? 'Kategori Lomba'
                          : 'Semua Kategori';
                      downloadRegistrationsCsvReport(filteredRegistrations, label);
                    }}
                    className="px-3 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-700 border border-emerald-600 text-amber-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    title="Khusus Admin: Unduh Data Pendaftar dalam format CSV"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-300" />
                    <span>CSV ({filteredRegistrations.length})</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {filteredRegistrations.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              Belum ada kontingen yang sesuai dengan filter pencarian.
            </div>
          ) : (
            <div className="space-y-6">
              {/* SECTION A: KATEGORI OLAHRAGA */}
              {(dirCategoryFilter === 'ALL' || dirCategoryFilter === 'Olahraga') && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-[#021b15] border border-amber-400/50 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <h4 className="text-sm font-bold text-amber-300 uppercase tracking-wide">
                          1. Direktori Peserta Kategori Olahraga ({olahragaRegistrations.length} Kontingen/Tim)
                        </h4>
                        <p className="text-[11px] text-slate-300">
                          Daftar kontingen terdaftar pada cabang pertandingan olahraga Porseni HAB ke-81
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isAdminUnlocked && (
                        <button
                          type="button"
                          onClick={() =>
                            downloadRegistrationsCsvReport(
                              olahragaRegistrations,
                              'Kategori Olahraga'
                            )
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-900 hover:bg-emerald-800 border border-emerald-700 text-amber-200 font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          <span>CSV Olahraga</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          void downloadRegistrationsPdfReport(
                            olahragaRegistrations,
                            undefined,
                            'Kategori Olahraga — Semua Cabang Olahraga'
                          )
                        }
                        className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Unduh Laporan PDF Olahraga ({olahragaRegistrations.length})</span>
                      </button>
                    </div>
                  </div>

                  {olahragaRegistrations.length === 0 ? (
                    <div className="p-6 rounded-xl bg-[#021b15]/60 border border-emerald-900 text-center text-xs text-slate-400">
                      Belum ada pendaftar pada Kategori Olahraga.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {olahragaRegistrations.map((reg) => (
                        <div
                          key={reg.id}
                          className="bg-[#021b15] border border-emerald-800/70 rounded-xl p-4 flex flex-col justify-between space-y-3"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="px-2 py-0.5 rounded bg-amber-400/20 border border-amber-400/40 text-[10px] font-bold text-amber-300">
                                    Kategori Olahraga
                                  </span>
                                  <span className="text-xs text-amber-200 font-semibold">
                                    {reg.competitionName}
                                  </span>
                                </div>
                                <h4 className="text-base font-bold text-white mt-1">
                                  {reg.namaTimAtauPeserta}
                                </h4>
                              </div>
                              <span className="text-xs text-emerald-300 font-mono-tabular shrink-0">
                                {reg.statusVerifikasi}
                              </span>
                            </div>

                            <div className="text-xs text-slate-300 mt-1">
                              Kontingen: <strong className="text-white">{reg.satker}</strong> · Format:{' '}
                              {reg.jenisPeserta} · Official: {reg.ketuaAtauOfficial}
                            </div>

                            <div className="mt-3 pt-2.5 border-t border-emerald-900/80">
                              <div className="text-[11px] text-slate-400 mb-1">
                                Daftar Atlet / Pemain ({reg.daftarPemain.length} orang):
                              </div>
                              <p className="text-xs text-emerald-200 leading-relaxed">
                                {reg.daftarPemain.join(' · ')}
                              </p>
                            </div>
                          </div>

                          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-2 border-t border-emerald-900/50">
                            <span>Terdaftar: {reg.waktuDaftar}</span>
                            {reg.catatanTambahan && (
                              <span className="text-amber-200/80 truncate max-w-[240px]">
                                {reg.catatanTambahan}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SECTION B: KATEGORI LOMBA */}
              {(dirCategoryFilter === 'ALL' || dirCategoryFilter === 'Lomba') && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-[#021b15] border border-emerald-500/50 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <h4 className="text-sm font-bold text-emerald-300 uppercase tracking-wide">
                          2. Direktori Peserta Kategori Lomba ({lombaRegistrations.length} Kontingen/Peserta)
                        </h4>
                        <p className="text-[11px] text-slate-300">
                          Daftar kontingen terdaftar pada cabang perlombaan Seni, Keagamaan & Ekshibisi HAB ke-81
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isAdminUnlocked && (
                        <button
                          type="button"
                          onClick={() =>
                            downloadRegistrationsCsvReport(
                              lombaRegistrations,
                              'Kategori Lomba'
                            )
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-900 hover:bg-emerald-800 border border-emerald-700 text-amber-200 font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          <span>CSV Lomba</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          void downloadRegistrationsPdfReport(
                            lombaRegistrations,
                            undefined,
                            'Kategori Lomba — Semua Cabang Lomba'
                          )
                        }
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Unduh Laporan PDF Lomba ({lombaRegistrations.length})</span>
                      </button>
                    </div>
                  </div>

                  {lombaRegistrations.length === 0 ? (
                    <div className="p-6 rounded-xl bg-[#021b15]/60 border border-emerald-900 text-center text-xs text-slate-400">
                      Belum ada pendaftar pada Kategori Lomba.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {lombaRegistrations.map((reg) => (
                        <div
                          key={reg.id}
                          className="bg-[#021b15] border border-emerald-800/70 rounded-xl p-4 flex flex-col justify-between space-y-3"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-bold text-emerald-300">
                                    Kategori Lomba
                                  </span>
                                  <span className="text-xs text-amber-200 font-semibold">
                                    {reg.competitionName}
                                  </span>
                                </div>
                                <h4 className="text-base font-bold text-white mt-1">
                                  {reg.namaTimAtauPeserta}
                                </h4>
                              </div>
                              <span className="text-xs text-emerald-300 font-mono-tabular shrink-0">
                                {reg.statusVerifikasi}
                              </span>
                            </div>

                            <div className="text-xs text-slate-300 mt-1">
                              Kontingen: <strong className="text-white">{reg.satker}</strong> · Format:{' '}
                              {reg.jenisPeserta} · Official: {reg.ketuaAtauOfficial}
                            </div>

                            <div className="mt-3 pt-2.5 border-t border-emerald-900/80">
                              <div className="text-[11px] text-slate-400 mb-1">
                                Daftar Peserta / Anggota ({reg.daftarPemain.length} orang):
                              </div>
                              <p className="text-xs text-emerald-200 leading-relaxed">
                                {reg.daftarPemain.join(' · ')}
                              </p>
                            </div>
                          </div>

                          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-2 border-t border-emerald-900/50">
                            <span>Terdaftar: {reg.waktuDaftar}</span>
                            {reg.catatanTambahan && (
                              <span className="text-amber-200/80 truncate max-w-[240px]">
                                {reg.catatanTambahan}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: LIVE MATCH SCOREBOARD */}
      {activeSubTab === 'scoreboard' && (
        <div className="bg-[#03251c] border border-emerald-800/80 rounded-2xl p-6 space-y-4">
          <div className="border-b border-emerald-800/70 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">
                Papan Skor Pertandingan (Live Match Scoreboard)
              </h3>
              <p className="text-xs text-slate-300">
                Hasil pertandingan Porseni HAB ke-81 diperbarui secara berkala oleh Koordinator Lomba
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[620px] overflow-y-auto pr-1">
            {matches.map((m) => (
              <div
                key={m.id}
                className="bg-[#021b15] border border-emerald-800/80 rounded-xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="font-semibold text-amber-300">
                    {m.competitionName} · {m.babak}
                  </span>
                  <span className="text-emerald-300 font-medium">{m.status}</span>
                </div>

                <div className="grid grid-cols-7 items-center gap-2 py-2 bg-[#03251c] rounded-lg px-3 border border-emerald-800/60">
                  <div className="col-span-3 text-sm font-bold text-white leading-snug">
                    {m.kontingenA}
                  </div>
                  <div className="col-span-1 text-center font-mono-tabular text-base font-extrabold text-amber-300">
                    {m.skorA} : {m.skorB}
                  </div>
                  <div className="col-span-3 text-right text-sm font-bold text-white leading-snug">
                    {m.kontingenB}
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center justify-between font-mono-tabular">
                  <span>{m.waktu}</span>
                  <span>Lokasi: {m.lokasi}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: MEDAL STANDINGS TABLE */}
      {activeSubTab === 'medals' && (
        <div className="bg-[#03251c] border border-emerald-800/80 rounded-2xl p-6 space-y-4">
          <div className="border-b border-emerald-800/70 pb-4">
            <h3 className="text-lg font-bold text-white">
              Klasemen Perolehan Medali Porseni HAB ke-81 Kemenag Tojo Una-Una
            </h3>
            <p className="text-xs text-slate-300">
              Rekapitulasi perolehan medali Emas, Perak, dan Perunggu antar-Satker, KUA, dan Madrasah
            </p>
          </div>

          <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-emerald-800 text-xs text-slate-300">
                  <th className="py-3 px-4 font-semibold">Peringkat</th>
                  <th className="py-3 px-4 font-semibold">Satker / Kontingen</th>
                  <th className="py-3 px-4 font-semibold text-center text-amber-300">Emas</th>
                  <th className="py-3 px-4 font-semibold text-center text-slate-200">Perak</th>
                  <th className="py-3 px-4 font-semibold text-center text-amber-600">Perunggu</th>
                  <th className="py-3 px-4 font-semibold text-center text-emerald-300">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/60 text-sm">
                {sortedMedals.map((row, idx) => {
                  const total = row.emas + row.perak + row.perunggu;
                  return (
                    <tr key={row.id} className="hover:bg-[#021b15]/60">
                      <td className="py-3 px-4 font-mono-tabular font-bold text-amber-300">
                        #{idx + 1}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">{row.satker}</td>
                      <td className="py-3 px-4 text-center font-mono-tabular font-bold text-amber-300">
                        {row.emas}
                      </td>
                      <td className="py-3 px-4 text-center font-mono-tabular font-semibold text-slate-200">
                        {row.perak}
                      </td>
                      <td className="py-3 px-4 text-center font-mono-tabular font-semibold text-amber-500">
                        {row.perunggu}
                      </td>
                      <td className="py-3 px-4 text-center font-mono-tabular font-bold text-emerald-300">
                        {total}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: BAGAN PERTANDINGAN & LOMBA (PDF, WORD, ATAU JPG/PNG) */}
      {activeSubTab === 'bagan' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 4 Cols: Competition Selector for Bagan */}
          <div className="lg:col-span-4 bg-[#03251c] border border-emerald-800/80 rounded-2xl p-5 space-y-4 max-h-[580px] overflow-y-auto">
            <div className="border-b border-emerald-800/70 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Daftar Bagan Olahraga & Lomba</span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Pilih cabang olahraga atau lomba untuk melihat atau mengunduh Bagan Pertandingan / Urutan Tampil (PDF, Word, atau JPG)
              </p>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-1.5">
              {(['Semua', 'Olahraga', 'Lomba'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setBaganCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    baganCategoryFilter === cat
                      ? 'bg-amber-400 text-slate-950 shadow-sm'
                      : 'bg-[#021b15] text-slate-300 hover:text-white border border-emerald-800/70'
                  }`}
                >
                  {cat === 'Semua' ? 'Semua' : `Kategori ${cat}`}
                </button>
              ))}
            </div>

            {/* Competition List with Bagan Status Badges */}
            <div className="space-y-2 max-h-[410px] overflow-y-auto pr-1">
              {filteredCompetitionsForBagan.map((comp) => {
                const isSelected = activeBaganComp?.id === comp.id;
                const hasBagan = Boolean(comp.baganUrl && comp.baganUrl.trim());
                const fType = detectBaganFileType(
                  comp.baganUrl,
                  comp.baganFileType,
                  comp.baganFileName
                );
                const badgeLabel = !hasBagan
                  ? 'Belum Diunggah'
                  : fType === 'pdf'
                  ? 'BAGAN PDF'
                  : fType === 'word'
                  ? 'BAGAN WORD'
                  : fType === 'image'
                  ? 'BAGAN JPG/PNG'
                  : 'LINK BAGAN';

                return (
                  <button
                    key={comp.id}
                    type="button"
                    onClick={() => {
                      setSelectedBaganCompId(comp.id);
                      setIsEditingBagan(false);
                      setShowBaganPinPrompt(false);
                      setBaganImageZoom(100);
                    }}
                    className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start justify-between gap-2 ${
                      isSelected
                        ? 'bg-emerald-900/80 border-amber-400 shadow-md'
                        : 'bg-[#021b15]/90 border-emerald-800/70 hover:border-emerald-600'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{comp.nama}</div>
                      <div className="text-[11px] text-slate-300 mt-0.5">
                        Kategori {normalizeCompetitionCategory(comp.kategori)} · {comp.jenisPeserta}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                        Jadwal: {comp.jadwalRingkas}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                        hasBagan
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-emerald-950 text-slate-400 border border-emerald-800'
                      }`}
                    >
                      {badgeLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right 8 Cols: Bagan Viewer (PDF / Word / JPG) + Admin Upload Editor */}
          <div className="lg:col-span-8 bg-[#03251c] border border-emerald-800/80 rounded-2xl p-5 sm:p-6 space-y-4 max-h-[580px] overflow-y-auto">
            {activeBaganComp ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-800/70 pb-4">
                  <div>
                    <div className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                      <GitBranch className="w-3.5 h-3.5" />
                      <span>
                        Bagan Resmi Kategori {normalizeCompetitionCategory(activeBaganComp.kategori)} — HAB ke-81
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white mt-0.5">
                      {activeBaganComp.nama}
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Format: {activeBaganComp.jenisPeserta} · Jadwal: {activeBaganComp.jadwalRingkas} · PIC: {activeBaganComp.koordinator}
                    </p>
                  </div>

                  {/* Action Buttons: Upload/Edit (Admin), Download, Share WA, Fullscreen */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {onUpdateCompetition && (
                      <button
                        type="button"
                        onClick={() => {
                          if (isAdminUnlocked) {
                            if (isEditingBagan) {
                              setIsEditingBagan(false);
                            } else {
                              openBaganEditorForComp(activeBaganComp);
                            }
                          } else {
                            setShowBaganPinPrompt((prev) => !prev);
                            setBaganPinError(null);
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/60 text-amber-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        title="Khusus Admin: Upload atau ubah file Bagan Pertandingan/Lomba dalam bentuk PDF, Word, atau JPG"
                      >
                        {isAdminUnlocked ? (
                          <Upload className="w-3.5 h-3.5 text-amber-300" />
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-amber-300" />
                        )}
                        <span>
                          {isEditingBagan
                            ? 'Tutup Form Upload'
                            : activeBaganComp.baganUrl
                            ? 'Ubah File Bagan (Admin)'
                            : '+ Upload Bagan PDF/Word/JPG (Admin)'}
                        </span>
                      </button>
                    )}

                    {activeBaganComp.baganUrl && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleDownloadBaganFile(activeBaganComp)}
                          className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Unduh Bagan</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleShareBaganToWa(activeBaganComp)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Bagikan WA</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setBaganFullscreen(true)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#021b15] hover:bg-emerald-900 border border-emerald-700 text-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          title="Buka tampilan Bagan dalam layar penuh"
                        >
                          <Maximize2 className="w-3.5 h-3.5 text-amber-300" />
                          <span>Layar Penuh</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {baganNotice && (
                  <div className="p-3 rounded-xl bg-emerald-900/90 border border-emerald-400/60 text-xs text-emerald-100 font-semibold flex items-center justify-between gap-2">
                    <span>{baganNotice}</span>
                    <button
                      type="button"
                      onClick={() => setBaganNotice(null)}
                      className="text-[11px] text-amber-300 underline cursor-pointer"
                    >
                      Tutup
                    </button>
                  </div>
                )}

                {/* Admin PIN Verification Prompt for Bagan Upload */}
                {showBaganPinPrompt && !isAdminUnlocked && (
                  <div className="p-4 rounded-xl bg-[#021b15] border-2 border-amber-400/60 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Masukkan PIN Admin untuk Mengunggah / Mengubah Bagan Pertandingan & Lomba</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowBaganPinPrompt(false)}
                        className="text-xs text-slate-400 hover:text-white cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>
                    {baganPinError && (
                      <div className="text-xs text-rose-300">{baganPinError}</div>
                    )}
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        value={baganPinInput}
                        onChange={(e) => setBaganPinInput(e.target.value)}
                        placeholder="Masukkan PIN Admin..."
                        className="px-3 py-1.5 rounded-lg bg-[#03251c] border border-emerald-700 text-xs text-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (baganPinInput.trim() === (adminPin || '812027')) {
                            onUnlockAdmin?.();
                            setBaganPinInput('');
                            openBaganEditorForComp(activeBaganComp);
                          } else {
                            setBaganPinError('PIN Admin tidak sesuai.');
                          }
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                      >
                        Buka Upload Bagan
                      </button>
                    </div>
                  </div>
                )}

                {/* Admin Upload / Edit Bagan Form (Supports PDF, Word .DOCX/.DOC, and JPG/PNG) */}
                {isEditingBagan && isAdminUnlocked && (
                  <div className="p-4 rounded-xl bg-[#021b15] border-2 border-amber-400/70 space-y-3.5">
                    <div className="flex items-center justify-between border-b border-emerald-800 pb-2">
                      <span className="text-xs font-bold text-amber-300">
                        Upload / Atur File Bagan Pertandingan & Lomba — {activeBaganComp.nama}
                      </span>
                      <span className="text-[11px] text-emerald-300">
                        Mendukung PDF, Word (.DOCX/.DOC), atau Gambar (.JPG/.PNG)
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <label className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm">
                        <Upload className="w-3.5 h-3.5" />
                        <span>
                          {isUploadingBagan
                            ? 'Memproses File Bagan...'
                            : 'Pilih File Bagan (.PDF / .DOCX / .DOC / .JPG / .PNG)'}
                        </span>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            e.target.value = '';
                            const lower = file.name.toLowerCase();
                            setIsUploadingBagan(true);
                            try {
                              if (
                                file.type.startsWith('image/') ||
                                /\.(jpg|jpeg|png|webp)$/i.test(lower)
                              ) {
                                const compressed = await compressBannerImageFile(file, 1400, 0.84);
                                setEditBaganUrl(compressed.dataUrl);
                                setEditBaganFileName(file.name);
                                setEditBaganFileType('image');
                                setBaganNotice(
                                  `Gambar Bagan "${file.name}" berhasil dimuat. Klik "Simpan & Tayangkan Bagan" di bawah.`
                                );
                              } else {
                                if (file.size > 3.5 * 1024 * 1024) {
                                  setBaganNotice(
                                    'Ukuran file PDF/Word maksimal 3.5 MB agar tetap ringan di HP & PC. Untuk file lebih besar, silakan tempel link Google Drive di kolom URL.'
                                  );
                                  setIsUploadingBagan(false);
                                  return;
                                }
                                const reader = new FileReader();
                                reader.onload = () => {
                                  const res = String(reader.result || '');
                                  setEditBaganUrl(res);
                                  setEditBaganFileName(file.name);
                                  if (lower.endsWith('.pdf') || file.type === 'application/pdf') {
                                    setEditBaganFileType('pdf');
                                  } else {
                                    setEditBaganFileType('word');
                                  }
                                  setBaganNotice(
                                    `Dokumen Bagan "${file.name}" siap disimpan. Klik "Simpan & Tayangkan Bagan".`
                                  );
                                  setIsUploadingBagan(false);
                                };
                                reader.onerror = () => {
                                  setBaganNotice('Gagal membaca file. Silakan coba lagi.');
                                  setIsUploadingBagan(false);
                                };
                                reader.readAsDataURL(file);
                                return;
                              }
                            } catch {
                              setBaganNotice('Gagal memproses file bagan.');
                            }
                            setIsUploadingBagan(false);
                          }}
                          className="hidden"
                        />
                      </label>

                      {editBaganUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditBaganUrl('');
                            setEditBaganFileName('');
                          }}
                          className="px-3 py-2 rounded-xl bg-rose-950/90 hover:bg-rose-900 text-rose-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Kosongkan File</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] text-slate-300 mb-1">
                          Atau Tempel Link File Bagan (Google Drive / URL Gambar / PDF):
                        </label>
                        <input
                          type="text"
                          value={
                            editBaganUrl.startsWith('data:')
                              ? `[File Terunggah: ${editBaganFileName || 'Bagan Resmi'}]`
                              : editBaganUrl
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            if (!val.startsWith('[File Terunggah:')) {
                              setEditBaganUrl(val);
                              setEditBaganFileType(
                                detectBaganFileType(val, undefined, editBaganFileName)
                              );
                            }
                          }}
                          placeholder="https://drive.google.com/... atau upload langsung dari tombol di atas"
                          className="w-full px-3 py-1.5 rounded-lg bg-[#03251c] border border-emerald-700 text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-300 mb-1">
                          Format Tampilan Bagan:
                        </label>
                        <select
                          value={editBaganFileType}
                          onChange={(e) =>
                            setEditBaganFileType(
                              e.target.value as 'pdf' | 'word' | 'image' | 'link'
                            )
                          }
                          className="w-full px-3 py-1.5 rounded-lg bg-[#03251c] border border-emerald-700 text-white"
                        >
                          <option value="pdf">Dokumen PDF (.pdf)</option>
                          <option value="word">Dokumen Word (.docx / .doc)</option>
                          <option value="image">Gambar Bagan (.jpg / .png)</option>
                          <option value="link">Link Eksternal / Google Drive</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1">
                        Keterangan / Catatan Bagan Pertandingan & Urutan Tampil Lomba (Opsional):
                      </label>
                      <textarea
                        rows={2}
                        value={editBaganCatatan}
                        onChange={(e) => setEditBaganCatatan(e.target.value)}
                        placeholder="Contoh: Bagan Sistem Gugur 16 Besar hasil Technical Meeting Panitia HAB ke-81..."
                        className="w-full px-3 py-1.5 rounded-lg bg-[#03251c] border border-emerald-700 text-xs text-white"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsEditingBagan(false)}
                        className="px-3 py-1.5 rounded-lg bg-[#03251c] text-slate-300 text-xs font-semibold cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const nowLabel = new Date().toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          });
                          onUpdateCompetition?.(activeBaganComp.id, {
                            baganUrl: editBaganUrl.trim() || undefined,
                            baganFileName: editBaganFileName.trim() || undefined,
                            baganFileType: editBaganUrl.trim() ? editBaganFileType : undefined,
                            baganCatatan: editBaganCatatan.trim() || undefined,
                            baganUpdatedAt: editBaganUrl.trim() ? nowLabel : undefined,
                          });
                          setIsEditingBagan(false);
                          setBaganNotice(
                            editBaganUrl.trim()
                              ? `✓ Bagan "${activeBaganComp.nama}" berhasil disimpan & langsung tampil untuk seluruh pengguna!`
                              : `Bagan untuk "${activeBaganComp.nama}" telah dihapus.`
                          );
                        }}
                        className="px-4 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Simpan & Tayangkan Bagan</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Bagan Notes / Metadata Banner if present */}
                {activeBaganComp.baganCatatan && (
                  <div className="p-3.5 rounded-xl bg-[#021b15] border border-emerald-800/90 text-xs text-slate-200 leading-relaxed">
                    <span className="font-bold text-amber-300 block mb-0.5">
                      Keterangan Resmi Panitia:
                    </span>
                    <div className="whitespace-pre-line">{activeBaganComp.baganCatatan}</div>
                  </div>
                )}

                {/* Inline Bagan Document / Image Viewer (Web & Android Compatible) */}
                {!activeBaganComp.baganUrl ? (
                  <div className="py-12 px-4 rounded-2xl bg-[#021b15] border border-dashed border-emerald-800 text-center space-y-3">
                    <GitBranch className="w-10 h-10 text-amber-400/60 mx-auto" />
                    <div className="text-sm font-bold text-white">
                      Bagan untuk &ldquo;{activeBaganComp.nama}&rdquo; Belum Diunggah
                    </div>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Panitia / Koordinator Seksi Lomba dapat mengunggah file Bagan Pertandingan atau Nomor Urut Tampil dalam format <strong>PDF (.pdf)</strong>, <strong>Word (.docx/.doc)</strong>, atau <strong>Gambar (.jpg/.png)</strong> melalui tombol <em>+ Upload Bagan PDF/Word/JPG (Admin)</em> di atas.
                    </p>
                  </div>
                ) : (() => {
                  const fType = detectBaganFileType(
                    activeBaganComp.baganUrl,
                    activeBaganComp.baganFileType,
                    activeBaganComp.baganFileName
                  );
                  const displayFileName =
                    activeBaganComp.baganFileName || `Bagan-${activeBaganComp.nama}`;

                  if (fType === 'pdf') {
                    return (
                      <div className="rounded-xl overflow-hidden border border-emerald-700 bg-white text-slate-900 p-3">
                        <InlinePdfCanvasViewer
                          fileDataUrl={
                            activeBaganComp.baganUrl.startsWith('data:')
                              ? activeBaganComp.baganUrl
                              : undefined
                          }
                          blobUrl={
                            !activeBaganComp.baganUrl.startsWith('data:')
                              ? activeBaganComp.baganUrl
                              : undefined
                          }
                          fileName={displayFileName}
                        />
                      </div>
                    );
                  }

                  if (fType === 'word') {
                    return (
                      <div className="rounded-xl overflow-hidden border border-emerald-700 bg-white text-slate-900 p-3">
                        <InlineWordDocViewer
                          fileDataUrl={activeBaganComp.baganUrl}
                          isiSuratTeks={activeBaganComp.baganCatatan}
                          fileName={displayFileName}
                          onDownload={() => handleDownloadBaganFile(activeBaganComp)}
                        />
                      </div>
                    );
                  }

                  if (fType === 'image') {
                    return (
                      <div className="rounded-xl overflow-hidden border border-emerald-700 bg-[#021b15] p-3 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-800 pb-2 text-xs">
                          <span className="text-amber-300 font-bold flex items-center gap-1.5">
                            <ImageIcon className="w-4 h-4" />
                            <span>Pratinjau Gambar Bagan ({displayFileName})</span>
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setBaganImageZoom((z) => Math.max(50, z - 25))
                              }
                              className="p-1.5 rounded bg-[#03251c] hover:bg-emerald-900 text-slate-200 cursor-pointer"
                              title="Perkecil"
                            >
                              <ZoomOut className="w-3.5 h-3.5" />
                            </button>
                            <span className="font-mono-tabular text-[11px] text-amber-300 px-1.5">
                              {baganImageZoom}%
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setBaganImageZoom((z) => Math.min(225, z + 25))
                              }
                              className="p-1.5 rounded bg-[#03251c] hover:bg-emerald-900 text-slate-200 cursor-pointer"
                              title="Perbesar"
                            >
                              <ZoomIn className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="overflow-auto max-h-[420px] rounded-lg bg-black/40 p-2 flex justify-center">
                          <img
                            src={activeBaganComp.baganUrl}
                            alt={`Bagan ${activeBaganComp.nama}`}
                            style={{ width: `${baganImageZoom}%`, maxWidth: 'none' }}
                            className="h-auto object-contain rounded"
                          />
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="p-5 rounded-xl bg-[#021b15] border border-emerald-700 space-y-3 text-center">
                      <div className="text-sm font-bold text-white">
                        Tautan Dokumen Bagan Eksternal — {activeBaganComp.nama}
                      </div>
                      <a
                        href={activeBaganComp.baganUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Buka Dokumen Bagan di Tab Baru</span>
                      </a>
                    </div>
                  );
                })()}
              </>
            ) : (
              <div className="py-12 text-center text-sm text-slate-400">
                Pilih cabang olahraga atau lomba di sebelah kiri untuk menampilkan bagan.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fullscreen Modal for Bagan Viewer */}
      {baganFullscreen && activeBaganComp && activeBaganComp.baganUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Layar Penuh Bagan ${activeBaganComp.nama}`}
          className="fixed inset-0 z-50 bg-black/90 flex flex-col p-3 sm:p-6 overflow-y-auto"
        >
          <div className="max-w-5xl w-full mx-auto bg-[#03251c] border-2 border-amber-400 rounded-2xl p-4 sm:p-6 space-y-4 flex-1 flex flex-col max-h-[94vh] overflow-y-auto">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-800 pb-3 shrink-0">
              <div>
                <div className="text-xs text-amber-300 font-bold">
                  Tampilan Layar Penuh Bagan Pertandingan & Lomba
                </div>
                <h3 className="text-lg font-bold text-white">{activeBaganComp.nama}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadBaganFile(activeBaganComp)}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Bagan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBaganFullscreen(false)}
                  className="px-3 py-1.5 rounded-lg bg-[#021b15] hover:bg-emerald-900 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Minimize2 className="w-3.5 h-3.5 text-amber-300" />
                  <span>Tutup Layar Penuh</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {(() => {
                const fType = detectBaganFileType(
                  activeBaganComp.baganUrl,
                  activeBaganComp.baganFileType,
                  activeBaganComp.baganFileName
                );
                const displayFileName =
                  activeBaganComp.baganFileName || `Bagan-${activeBaganComp.nama}`;
                if (fType === 'pdf') {
                  return (
                    <div className="rounded-xl bg-white text-slate-900 p-3">
                      <InlinePdfCanvasViewer
                        fileDataUrl={
                          activeBaganComp.baganUrl.startsWith('data:')
                            ? activeBaganComp.baganUrl
                            : undefined
                        }
                        blobUrl={
                          !activeBaganComp.baganUrl.startsWith('data:')
                            ? activeBaganComp.baganUrl
                            : undefined
                        }
                        fileName={displayFileName}
                      />
                    </div>
                  );
                }
                if (fType === 'word') {
                  return (
                    <div className="rounded-xl bg-white text-slate-900 p-3">
                      <InlineWordDocViewer
                        fileDataUrl={activeBaganComp.baganUrl}
                        isiSuratTeks={activeBaganComp.baganCatatan}
                        fileName={displayFileName}
                        onDownload={() => handleDownloadBaganFile(activeBaganComp)}
                      />
                    </div>
                  );
                }
                if (fType === 'image') {
                  return (
                    <div className="rounded-xl bg-[#021b15] p-3 flex justify-center overflow-auto">
                      <img
                        src={activeBaganComp.baganUrl}
                        alt={`Bagan ${activeBaganComp.nama}`}
                        className="max-w-full h-auto object-contain rounded"
                      />
                    </div>
                  );
                }
                return (
                  <div className="p-6 text-center">
                    <a
                      href={activeBaganComp.baganUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Buka Dokumen Bagan di Tab Baru</span>
                    </a>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Juknis Detail & Direct Admin Editor Modal */}
      {activeJuknisComp && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="juknis-modal-title"
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-[#03251c] border border-amber-400/60 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 border-b border-emerald-800 pb-3">
              <div>
                <div className="text-xs text-amber-300 font-semibold">
                  Petunjuk Teknis (Juknis) Cabang Lomba HAB ke-81
                </div>
                <h3 id="juknis-modal-title" className="text-lg font-bold text-white mt-0.5">
                  {activeJuknisComp.nama}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {onUpdateCompetition && (
                  <button
                    type="button"
                    onClick={() => {
                      if (isAdminUnlocked) {
                        setEditJuknisCatatan(
                          activeJuknisComp.catatan ||
                            'Peserta wajib melakukan registrasi daring melalui portal HABKEMENAGTOUNA dan hadir 30 menit sebelum jadwal pertandingan.'
                        );
                        setEditJuknisUrl(
                          activeJuknisComp.juknisUrl === '#juknis'
                            ? ''
                            : activeJuknisComp.juknisUrl || ''
                        );
                        setEditJuknisJadwal(activeJuknisComp.jadwalRingkas || '');
                        setEditJuknisPic(activeJuknisComp.koordinator || '');
                        setIsEditingJuknisModal((prev) => !prev);
                        setShowJuknisPinPrompt(false);
                      } else {
                        setShowJuknisPinPrompt((prev) => !prev);
                        setJuknisPinError(null);
                      }
                    }}
                    className="px-2.5 py-1 rounded bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/50 text-amber-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isEditingJuknisModal ? 'Batal Edit' : 'Edit Juknis (Admin)'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setActiveJuknisComp(null);
                    setIsEditingJuknisModal(false);
                    setShowJuknisPinPrompt(false);
                  }}
                  className="px-2.5 py-1 rounded bg-[#021b15] text-slate-300 hover:text-white text-xs cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>

            {juknisBannerMsg && (
              <div className="p-2.5 rounded-lg bg-emerald-900/90 border border-emerald-500/60 text-xs text-emerald-200 font-semibold">
                {juknisBannerMsg}
              </div>
            )}

            {/* Admin PIN verification inside Juknis modal if not unlocked */}
            {showJuknisPinPrompt && !isAdminUnlocked && (
              <div className="p-3.5 rounded-xl bg-[#021b15] border border-amber-400/50 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Verifikasi PIN Admin untuk Mengisi / Mengedit Juknis</span>
                </div>
                {juknisPinError && (
                  <div className="text-[11px] text-rose-300">{juknisPinError}</div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    value={juknisPinInput}
                    onChange={(e) => setJuknisPinInput(e.target.value)}
                    placeholder="Masukkan PIN Admin"
                    className="px-3 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (juknisPinInput.trim() === (adminPin || '812027')) {
                        onUnlockAdmin?.();
                        setShowJuknisPinPrompt(false);
                        setJuknisPinInput('');
                        setEditJuknisCatatan(
                          activeJuknisComp.catatan ||
                            'Peserta wajib melakukan registrasi daring melalui portal HABKEMENAGTOUNA dan hadir 30 menit sebelum jadwal pertandingan.'
                        );
                        setEditJuknisUrl(
                          activeJuknisComp.juknisUrl === '#juknis'
                            ? ''
                            : activeJuknisComp.juknisUrl || ''
                        );
                        setEditJuknisJadwal(activeJuknisComp.jadwalRingkas || '');
                        setEditJuknisPic(activeJuknisComp.koordinator || '');
                        setIsEditingJuknisModal(true);
                      } else {
                        setJuknisPinError('PIN Admin tidak sesuai.');
                      }
                    }}
                    className="px-3 py-1.5 rounded bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    Buka Editor Juknis
                  </button>
                </div>
              </div>
            )}

            {isEditingJuknisModal ? (
              <div className="p-4 rounded-xl bg-[#021b15] border border-amber-400/50 space-y-3">
                <div className="text-xs font-bold text-amber-300">
                  Editor Petunjuk Teknis (Juknis) — {activeJuknisComp.nama}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">
                      Jadwal Pelaksanaan:
                    </label>
                    <input
                      type="text"
                      value={editJuknisJadwal}
                      onChange={(e) => setEditJuknisJadwal(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">
                      Koordinator Seksi / PIC:
                    </label>
                    <input
                      type="text"
                      value={editJuknisPic}
                      onChange={(e) => setEditJuknisPic(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">
                    Isi Ketentuan Teknis / Aturan Juknis Lomba (Bisa beberapa baris / penomoran):
                  </label>
                  <textarea
                    rows={5}
                    value={editJuknisCatatan}
                    onChange={(e) => setEditJuknisCatatan(e.target.value)}
                    placeholder="Contoh:&#10;1. Setiap Satker mengirimkan maksimal 1 tim/regu.&#10;2. Sistem pertandingan menggunakan sistem gugur.&#10;3. Peserta wajib hadir 30 menit sebelum jadwal dimulai."
                    className="w-full px-3 py-2 rounded bg-[#03251c] border border-emerald-700 text-xs text-white leading-relaxed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] text-slate-300">
                    Link Dokumen Juknis (Google Drive / PDF) atau Upload File PDF/Gambar Juknis (Maks 2MB):
                  </label>
                  <input
                    type="text"
                    value={
                      editJuknisUrl.startsWith('data:')
                        ? 'File Juknis Lokal Terunggah'
                        : editJuknisUrl
                    }
                    onChange={(e) => setEditJuknisUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/... (Opsional)"
                    className="w-full px-3 py-1.5 rounded bg-[#03251c] border border-emerald-700 text-xs text-white"
                  />
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <label className="px-3 py-1.5 rounded bg-emerald-800 hover:bg-emerald-700 text-emerald-100 text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload File PDF / Gambar Juknis</span>
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 2 * 1024 * 1024) {
                            setJuknisBannerMsg(
                              'Ukuran file maksimal 2 MB. Untuk PDF lebih besar, silakan upload ke Google Drive lalu tempel link-nya.'
                            );
                            e.target.value = '';
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = () => {
                            setEditJuknisUrl(String(reader.result || ''));
                            setJuknisBannerMsg(`File "${file.name}" siap disimpan.`);
                          };
                          reader.readAsDataURL(file);
                          e.target.value = '';
                        }}
                        className="hidden"
                      />
                    </label>
                    {editJuknisUrl && (
                      <button
                        type="button"
                        onClick={() => setEditJuknisUrl('')}
                        className="px-2.5 py-1.5 rounded bg-rose-950/80 text-rose-300 text-[11px] cursor-pointer"
                      >
                        Hapus File/Link
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingJuknisModal(false)}
                    className="px-3 py-1.5 rounded bg-[#03251c] text-slate-300 text-xs cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const updated: Partial<Competition> = {
                        catatan: editJuknisCatatan.trim(),
                        juknisUrl: editJuknisUrl.trim() || '#juknis',
                        jadwalRingkas: editJuknisJadwal.trim() || activeJuknisComp.jadwalRingkas,
                        koordinator: editJuknisPic.trim() || activeJuknisComp.koordinator,
                      };
                      onUpdateCompetition?.(activeJuknisComp.id, updated);
                      setActiveJuknisComp({ ...activeJuknisComp, ...updated });
                      setIsEditingJuknisModal(false);
                      setJuknisBannerMsg('Juknis berhasil diperbarui dan disimpan!');
                      window.setTimeout(() => setJuknisBannerMsg(null), 3500);
                    }}
                    className="px-4 py-1.5 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    Simpan Perubahan Juknis
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-slate-200 leading-relaxed">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-xl bg-[#021b15] border border-emerald-800/80">
                  <p>
                    <strong className="text-amber-300">Kategori:</strong>{' '}
                    {activeJuknisComp.kategori}
                  </p>
                  <p>
                    <strong className="text-amber-300">Format Kepesertaan:</strong>{' '}
                    {activeJuknisComp.jenisPeserta} (Maks {activeJuknisComp.kuotaPemain} Orang)
                  </p>
                  <p>
                    <strong className="text-amber-300">Jadwal Pelaksanaan:</strong>{' '}
                    {activeJuknisComp.jadwalRingkas}
                  </p>
                  <p>
                    <strong className="text-amber-300">Koordinator Seksi:</strong>{' '}
                    {activeJuknisComp.koordinator}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#021b15] border border-emerald-800/90 space-y-1.5">
                  <div className="text-amber-300 font-bold text-xs">
                    Ketentuan & Aturan Teknis Lomba:
                  </div>
                  <div className="text-slate-200 whitespace-pre-line leading-relaxed">
                    {activeJuknisComp.catatan ||
                      'Peserta wajib melakukan registrasi daring melalui portal HABKEMENAGTOUNA dan hadir 30 menit sebelum jadwal pertandingan.'}
                  </div>
                </div>

                {activeJuknisComp.juknisUrl &&
                  activeJuknisComp.juknisUrl !== '#juknis' &&
                  (activeJuknisComp.juknisUrl.startsWith('http') ||
                    activeJuknisComp.juknisUrl.startsWith('data:')) && (
                    <div className="pt-1 space-y-2">
                      {activeJuknisComp.juknisUrl.startsWith('data:image/') && (
                        <div className="rounded-xl overflow-hidden border border-emerald-700 bg-[#021b15] p-2">
                          <img
                            src={activeJuknisComp.juknisUrl}
                            alt={`Infografis Juknis ${activeJuknisComp.nama}`}
                            className="w-full max-h-72 object-contain rounded-lg"
                          />
                        </div>
                      )}
                      <a
                        href={activeJuknisComp.juknisUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={
                          activeJuknisComp.juknisUrl.startsWith('data:')
                            ? `Juknis-${activeJuknisComp.nama.replace(/\s+/g, '-')}`
                            : undefined
                        }
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 border border-amber-400/50 text-amber-200 font-bold text-xs transition-colors"
                      >
                        <Download className="w-4 h-4 text-amber-300" />
                        <span>Unduh / Buka Dokumen Juknis Lengkap (PDF / Drive)</span>
                      </a>
                    </div>
                  )}
              </div>
            )}

            <div className="pt-3 border-t border-emerald-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsCustomProposal(false);
                  setSelectedCompId(activeJuknisComp.id);
                  setActiveJuknisComp(null);
                  setIsEditingJuknisModal(false);
                }}
                className="px-4 py-2 rounded-lg bg-amber-400 text-slate-950 font-semibold text-xs cursor-pointer"
              >
                Pilih & Daftar Cabang Ini
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
