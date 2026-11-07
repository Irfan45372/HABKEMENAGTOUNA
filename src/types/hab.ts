export type CompetitionCategory =
  | 'Olahraga'
  | 'Seni & Budaya'
  | 'Keagamaan & Akademik'
  | 'Hiburan / Eksibisi'
  | string;

export type ParticipantFormat = 'Perorangan/Individu' | 'Ganda' | 'Beregu/Tim';

export type RegistrationStatus = 'Buka' | 'Tutup';

export interface Competition {
  id: string;
  nama: string;
  kategori: CompetitionCategory;
  jenisPeserta: ParticipantFormat;
  kuotaPemain: number;
  statusPendaftaran: RegistrationStatus;
  juknisUrl: string;
  jadwalRingkas: string;
  lokasiId: string;
  koordinator: string;
  catatan?: string;
}

export interface ParticipantRegistration {
  id: string;
  competitionId: string;
  competitionName: string;
  kategori: string;
  jenisPeserta: ParticipantFormat;
  isCustomProposal?: boolean;
  customCabangName?: string;
  satker: string;
  namaTimAtauPeserta: string;
  ketuaAtauOfficial: string;
  kontakWhatsapp: string;
  nipAtauIdentitas: string;
  daftarPemain: string[];
  catatanTambahan?: string;
  waktuDaftar: string;
  statusVerifikasi: 'Terverifikasi' | 'Menunggu';
}

export interface MatchScore {
  id: string;
  competitionId: string;
  competitionName: string;
  babak: string;
  kontingenA: string;
  kontingenB: string;
  skorA: string;
  skorB: string;
  waktu: string;
  lokasi: string;
  status: 'Sedang Berlangsung' | 'Selesai' | 'Terjadwal';
}

export interface MedalStanding {
  id: string;
  satker: string;
  emas: number;
  perak: number;
  perunggu: number;
}

export type ScheduleStatus =
  | 'Terjadwal'
  | 'Sedang Berlangsung'
  | 'Ditunda/Pindah Lokasi'
  | 'Selesai';

export interface ScheduleEvent {
  id: string;
  judul: string;
  kategori: string;
  tanggal: string;
  waktu: string;
  lokasiId: string;
  lokasiNama: string;
  pic: string;
  status: ScheduleStatus;
  catatan: string;
}

export type VenueArchetype =
  | 'kantor_kemenag'
  | 'lapangan_utama'
  | 'gor_olahraga'
  | 'masjid_agung'
  | 'aula_kerukunan'
  | 'pelabuhan_kepulauan';

export interface VenueLocation {
  id: string;
  nama: string;
  kategoriTitik?: string;
  alamat: string;
  koordinatX?: number;
  koordinatZ?: number;
  latitude?: number;
  longitude?: number;
  koordinatGps?: string;
  archetype?: VenueArchetype;
  googleMapsUrl: string;
  deskripsi: string;
  kapasitas: string;
}

export interface BaksosMetric {
  id: string;
  namaProgram: string;
  target: number;
  capaian: number;
  satuan: string;
  lokasi: string;
  koordinator: string;
}

export interface JalanSehatCoupon {
  id: string;
  nomorKupon: string;
  namaPeserta: string;
  satkerAtauUmum: string;
  nikAtauNip: string;
  noHp: string;
  waktuRegistrasi: string;
  sudahMenang?: boolean;
  hadiahDimenangkan?: string;
}

export interface HarmonyMessage {
  id: string;
  nama: string;
  jabatanAtauSatker: string;
  kategori: 'Ucapan Selamat HAB ke-81' | 'Aspirasi & Saran Panitia' | 'Doa Kerukunan Umat';
  pesan: string;
  bannerImageUrl?: string; // Opsional: Gambar Banner / Spanduk Ucapan Satker
  waktu: string;
  disetujui: boolean;
}

export interface NavLabelsConfig {
  beranda: string;
  peta: string;
  lomba: string;
  jadwal: string;
  kupon: string;
  jurnal?: string;
}

export interface WelcomeVoiceConfig {
  enabled: boolean;
  mode: 'tts' | 'audio_url';
  welcomeText: string;
  audioUrl: string;
}

export interface BrandingConfig {
  brandWordmark?: string; // Default: "HABKEMENAGTOUNA"
  tickerBadgeLabel?: string; // Default: "INFO PANITIA"
  navLabels?: NavLabelsConfig;
  heroEyebrow?: string; // Default: "Kemenag RI · Kab. Tojo Una-Una"
  kemenagLogoPrimaryUrl: string;
  kemenagLogoFallbackUrl: string;
  habLogoCustomUrl: string; // Empty string = render procedural Gold & Emerald "81" emblem
  habLogoStatusBadge: string; // e.g., "Logo Sementara — Menunggu Rilis Resmi Pusat"
  showHabStatusBadge: boolean;
  officialTitle: string;
  officialSubtitle: string;
  officialTagline: string;
  countdownHeading?: string; // Default: "Hitung Mundur Upacara Puncak HAB ke-81"
  countdownTargetLabel?: string; // Default: "Target: 03 Jan 2027 · 07:30 WITA"
  countdownTargetIso: string; // Default: 2027-01-03T07:30:00+08:00
  runningTextItems: string[];
  allowCustomCompetitionProposal: boolean;
  adminPin: string;
  welcomeVoice?: WelcomeVoiceConfig;
}

export interface VideoItem {
  id: string;
  judul: string;
  satker: string;
  kategori:
    | 'Live Streaming & Upacara'
    | 'Lomba Video Kreatif & Moderasi'
    | 'Profil & Inovasi Satker'
    | 'Dokumentasi Porseni & Baksos'
    | string;
  sumberipe: 'youtube' | 'direct_video';
  youtubeUrl?: string;
  videoFileUrl?: string; // URL MP4 atau DataURL video pendek
  durasiLabel?: string;
  deskripsi?: string;
  bannerUcapanTeks?: string; // Opsional: Teks Banner Ucapan Satker
  bannerUcapanUrl?: string; // Opsional: Gambar Banner Ucapan Satker
  waktuUpload: string;
  disetujui: boolean;
}

export type SatkerBannerCategory =
  | 'Spanduk & Banner Ucapan'
  | 'Persiapan Lomba'
  | 'Baksos'
  | 'Kunjungan Kerja'
  | 'Upacara & Seremonial'
  | string;

export interface SatkerBannerItem {
  id: string;
  satker: string;
  kategori: SatkerBannerCategory;
  judul: string;
  imageUrl: string; // DataURL terkompresi atau Link URL Gambar
  bannerUcapan?: string; // Opsional: Slogan / Teks Banner Ucapan Satker
  keterangan?: string; // Opsional: Deskripsi foto persiapan/kegiatan
  waktuUpload: string;
  disetujui: boolean;
}

export interface JournalArticle {
  id: string;
  judul: string;
  kategoriLokasi: string; // Contoh: "TOJO UNA UNA"
  penulis: string; // Contoh: "H. Sam Asiku" / "Tim Humas Kemenag Touna"
  satker: string;
  tanggalWaktu: string; // Contoh: "Kamis, 05 November 2026 - 14:54 WITA"
  leadParagraf: string; // Paragraf pembuka cetak tebal-miring
  isiBerita: string; // Isi berita lengkap multi-paragraf (dipisahkan baris baru)
  photos: string[]; // Array 1 s/d 4 foto (photos[0] = Foto Utama yang tampil saat share WA)
  captionFotoUtama?: string;
  disetujui: boolean;
}

export interface AppState {
  branding: BrandingConfig;
  competitions: Competition[];
  satkerList: string[];
  registrations: ParticipantRegistration[];
  matches: MatchScore[];
  medalStandings: MedalStanding[];
  schedules: ScheduleEvent[];
  venues: VenueLocation[];
  baksosMetrics: BaksosMetric[];
  coupons: JalanSehatCoupon[];
  messages: HarmonyMessage[];
  videos?: VideoItem[];
  satkerBanners?: SatkerBannerItem[];
  journals?: JournalArticle[];
}


