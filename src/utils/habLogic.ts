import {
  AppState,
  Competition,
  JalanSehatCoupon,
  MedalStanding,
  ParticipantFormat,
  ParticipantRegistration,
} from '../types/hab';

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
  totalSeconds: number;
}

/**
 * Calculates remaining days, hours, minutes, seconds to target ISO timestamp.
 */
export function calculateCountdown(targetIso: string, nowMs: number = Date.now()): CountdownParts {
  const targetMs = Date.parse(targetIso);
  if (Number.isNaN(targetMs)) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false, totalSeconds: 0 };
  }
  const diffMs = targetMs - nowMs;
  if (diffMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true, totalSeconds: 0 };
  }
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds, isPast: false, totalSeconds };
}

/**
 * Returns how many minimum and maximum player input slots a competition requires.
 */
export function getRequiredPlayerSlots(comp: Pick<Competition, 'jenisPeserta' | 'kuotaPemain'>): {
  minPlayers: number;
  maxPlayers: number;
  requiresOfficial: boolean;
} {
  if (comp.jenisPeserta === 'Perorangan/Individu') {
    return { minPlayers: 1, maxPlayers: 1, requiresOfficial: false };
  }
  if (comp.jenisPeserta === 'Ganda') {
    return { minPlayers: 2, maxPlayers: Math.max(2, comp.kuotaPemain || 2), requiresOfficial: true };
  }
  const maxPlayers = Math.max(3, comp.kuotaPemain || 6);
  return {
    minPlayers: 2,
    maxPlayers,
    requiresOfficial: true,
  };
}

export interface RegistrationValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates flexible competition registration form data before saving.
 */
export function validateRegistrationInput(input: {
  competition?: Competition | null;
  isCustomProposal: boolean;
  customCabangName: string;
  satker: string;
  namaTimAtauPeserta: string;
  ketuaAtauOfficial: string;
  kontakWhatsapp: string;
  daftarPemain: string[];
}): RegistrationValidationResult {
  if (!input.satker || input.satker.trim().length < 2) {
    return { valid: false, error: 'Silakan pilih atau ketik nama Satker / Kontingen terlebih dahulu.' };
  }

  if (input.isCustomProposal) {
    if (!input.customCabangName || input.customCabangName.trim().length < 3) {
      return { valid: false, error: 'Nama usulan cabang lomba baru minimal 3 karakter.' };
    }
  } else {
    if (!input.competition) {
      return { valid: false, error: 'Silakan pilih cabang lomba yang tersedia.' };
    }
    if (input.competition.statusPendaftaran === 'Tutup') {
      return { valid: false, error: `Pendaftaran untuk cabang ${input.competition.nama} sedang ditutup.` };
    }
  }

  if (!input.namaTimAtauPeserta || input.namaTimAtauPeserta.trim().length < 2) {
    return { valid: false, error: 'Nama Peserta / Regu wajib diisi.' };
  }

  if (!input.kontakWhatsapp || input.kontakWhatsapp.trim().length < 7) {
    return { valid: false, error: 'Nomor kontak WhatsApp aktif wajib diisi.' };
  }

  const cleanPlayers = input.daftarPemain.map((p) => p.trim()).filter(Boolean);
  if (!input.isCustomProposal && input.competition) {
    const slots = getRequiredPlayerSlots(input.competition);
    if (cleanPlayers.length < slots.minPlayers) {
      return {
        valid: false,
        error: `Cabang ${input.competition.nama} (${input.competition.jenisPeserta}) membutuhkan minimal ${slots.minPlayers} nama pemain.`,
      };
    }
    if (slots.requiresOfficial && (!input.ketuaAtauOfficial || input.ketuaAtauOfficial.trim().length < 2)) {
      return {
        valid: false,
        error: 'Nama Official / Manajer Kontingen wajib diisi untuk nomor Ganda atau Beregu.',
      };
    }
  } else if (cleanPlayers.length < 1) {
    return { valid: false, error: 'Masukkan minimal 1 nama peserta.' };
  }

  return { valid: true };
}

/**
 * Creates a normalized ParticipantRegistration record.
 */
export function createRegistrationRecord(params: {
  id: string;
  competition?: Competition | null;
  isCustomProposal: boolean;
  customCabangName: string;
  customFormat?: ParticipantFormat;
  satker: string;
  namaTimAtauPeserta: string;
  ketuaAtauOfficial: string;
  kontakWhatsapp: string;
  nipAtauIdentitas: string;
  daftarPemain: string[];
  catatanTambahan?: string;
  waktuDaftar?: string;
}): ParticipantRegistration {
  const cleanPlayers = params.daftarPemain.map((p) => p.trim()).filter(Boolean);
  return {
    id: params.id,
    competitionId: params.isCustomProposal ? 'custom-proposal' : params.competition?.id || 'unknown',
    competitionName: params.isCustomProposal
      ? `Usulan: ${params.customCabangName.trim()}`
      : params.competition?.nama || 'Cabang Lomba',
    kategori: params.isCustomProposal ? 'Usulan Kontingen' : params.competition?.kategori || 'Olahraga',
    jenisPeserta: params.isCustomProposal
      ? params.customFormat || 'Beregu/Tim'
      : params.competition?.jenisPeserta || 'Perorangan/Individu',
    isCustomProposal: params.isCustomProposal,
    customCabangName: params.isCustomProposal ? params.customCabangName.trim() : undefined,
    satker: params.satker.trim(),
    namaTimAtauPeserta: params.namaTimAtauPeserta.trim(),
    ketuaAtauOfficial: params.ketuaAtauOfficial.trim() || params.namaTimAtauPeserta.trim(),
    kontakWhatsapp: params.kontakWhatsapp.trim(),
    nipAtauIdentitas: params.nipAtauIdentitas.trim(),
    daftarPemain: cleanPlayers,
    catatanTambahan: params.catatanTambahan?.trim(),
    waktuDaftar: params.waktuDaftar || new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    statusVerifikasi: 'Terverifikasi',
  };
}

/**
 * Generates an official formatted ticket number for Jalan Sehat Kerukunan HAB-81 Tojo Una-Una.
 */
export function generateJalanSehatTicketNumber(sequenceIndex: number,nikSuffix: string = ''): string {
  const paddedSeq = String(Math.max(1, sequenceIndex)).padStart(4, '0');
  const cleanSuffix = nikSuffix.replace(/\D/g, '').slice(-2).padStart(2, '8');
  return `HAB81-TOUNA-${paddedSeq}-${cleanSuffix}`;
}

/**
 * Deterministic 21x21 QR-like Matrix Generator with standard finder patterns, timing patterns,
 * and payload encoding so QR codes render crisply offline on HTML5 Canvas without external APIs.
 */
export function generateQrMatrix(payload: string): number[][] {
  const size = 21;
  const matrix: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
  const reserved: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const placeFinder = (rowOffset: number, colOffset: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        matrix[rowOffset + r][colOffset + c] = isBorder || isInner ? 1 : 0;
        reserved[rowOffset + r][colOffset + c] = true;
      }
    }
  };

  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // Separators around finder patterns
  for (let i = 0; i < 8; i++) {
    const coords = [
      [7, i], [i, 7],
      [7, size - 1 - i], [i, size - 8],
      [size - 8, i], [size - 1 - i, 7],
    ];
    for (const [r, c] of coords) {
      if (r >= 0 && r < size && c >= 0 && c < size) {
        reserved[r][c] = true;
      }
    }
  }

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0 ? 1 : 0;
    reserved[6][i] = true;
    matrix[i][6] = i % 2 === 0 ? 1 : 0;
    reserved[i][6] = true;
  }

  // Deterministic hash stream from payload
  let hash = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  let bitIdx = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (reserved[r][c]) continue;
      const charCode = payload.charCodeAt(bitIdx % Math.max(1, payload.length)) || 81;
      const mixed = ((hash >>> (bitIdx % 24)) ^ (charCode * (r + 3) + c * 17 + bitIdx * 7)) & 1;
      matrix[r][c] = mixed;
      bitIdx++;
    }
  }

  return matrix;
}

/**
 * Sorts medal standings by Gold, then Silver, then Bronze descending.
 */
export function sortMedalStandings(standings: MedalStanding[]): MedalStanding[] {
  return [...standings].sort((a, b) => {
    if (b.emas !== a.emas) return b.emas - a.emas;
    if (b.perak !== a.perak) return b.perak - a.perak;
    if (b.perunggu !== a.perunggu) return b.perunggu - a.perunggu;
    return a.satker.localeCompare(b.satker, 'id');
  });
}

/**
 * Selects a lucky draw winner from eligible (unwon) coupons.
 */
export function pickLuckyDrawWinner(
  coupons: JalanSehatCoupon[],
  randomZeroToOne: number = Math.random()
): JalanSehatCoupon | null {
  const eligible = coupons.filter((c) => !c.sudahMenang);
  if (eligible.length === 0) return null;
  const clamped = Math.max(0, Math.min(0.999999, randomZeroToOne));
  const index = Math.floor(clamped * eligible.length);
  return eligible[index];
}

/**
 * Validates an imported JSON object to ensure it contains core AppState keys before applying.
 */
export function validateImportedState(raw: unknown): { valid: boolean; state?: AppState; error?: string } {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'File JSON tidak valid.' };
  }
  const candidate = raw as Partial<AppState>;
  if (
    !candidate.branding ||
    !Array.isArray(candidate.competitions) ||
    !Array.isArray(candidate.satkerList) ||
    !Array.isArray(candidate.schedules) ||
    !Array.isArray(candidate.venues)
  ) {
    return {
      valid: false,
      error: 'Struktur JSON tidak sesuai dengan skema HABKEMENAGTOUNA (branding, competitions, satkerList, schedules, venues diperlukan).',
    };
  }
  return { valid: true, state: candidate as AppState };
}
