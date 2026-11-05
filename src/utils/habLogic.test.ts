import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCountdown,
  createRegistrationRecord,
  generateJalanSehatTicketNumber,
  generateQrMatrix,
  getRequiredPlayerSlots,
  pickLuckyDrawWinner,
  sortMedalStandings,
  validateImportedState,
  validateRegistrationInput,
} from './habLogic';
import { Competition, JalanSehatCoupon, MedalStanding } from '../types/hab';

test('calculateCountdown accurately computes days, hours, minutes, seconds', () => {
  const target = '2027-01-03T07:30:00+08:00';
  const targetMs = Date.parse(target);
  const nowMs = targetMs - (2 * 86400 + 5 * 3600 + 12 * 60 + 45) * 1000;
  const result = calculateCountdown(target, nowMs);

  assert.equal(result.days, 2);
  assert.equal(result.hours, 5);
  assert.equal(result.minutes, 12);
  assert.equal(result.seconds, 45);
  assert.equal(result.isPast, false);
});

test('getRequiredPlayerSlots adapts to Perorangan, Ganda, and Beregu', () => {
  assert.deepEqual(
    getRequiredPlayerSlots({ jenisPeserta: 'Perorangan/Individu', kuotaPemain: 1 }),
    { minPlayers: 1, maxPlayers: 1, requiresOfficial: false }
  );
  assert.deepEqual(
    getRequiredPlayerSlots({ jenisPeserta: 'Ganda', kuotaPemain: 2 }),
    { minPlayers: 2, maxPlayers: 2, requiresOfficial: true }
  );
  assert.deepEqual(
    getRequiredPlayerSlots({ jenisPeserta: 'Beregu/Tim', kuotaPemain: 8 }),
    { minPlayers: 2, maxPlayers: 8, requiresOfficial: true }
  );
});

test('validateRegistrationInput enforces dynamic format and open status', () => {
  const openTeamComp: Competition = {
    id: 'comp-voli',
    nama: 'Bola Voli Putra/Putri',
    kategori: 'Olahraga',
    jenisPeserta: 'Beregu/Tim',
    kuotaPemain: 8,
    statusPendaftaran: 'Buka',
    juknisUrl: '#juknis',
    jadwalRingkas: '18 Des 2026',
    lokasiId: 'venue-kemenag',
    koordinator: 'Panitia Porseni',
  };

  // Missing second player for Beregu/Tim
  const invalidRes = validateRegistrationInput({
    competition: openTeamComp,
    isCustomProposal: false,
    customCabangName: '',
    satker: 'KUA Ampana Kota',
    namaTimAtauPeserta: 'Garuda KUA Ampana',
    ketuaAtauOfficial: 'H. Ahmad',
    kontakWhatsapp: '081234567890',
    daftarPemain: ['Budi Santoso'],
  });
  assert.equal(invalidRes.valid, false);

  // Valid team registration
  const validRes = validateRegistrationInput({
    competition: openTeamComp,
    isCustomProposal: false,
    customCabangName: '',
    satker: 'KUA Ampana Kota',
    namaTimAtauPeserta: 'Garuda KUA Ampana',
    ketuaAtauOfficial: 'H. Ahmad',
    kontakWhatsapp: '081234567890',
    daftarPemain: ['Budi Santoso', 'Rizky Pratama', 'Fadel Muhammad'],
  });
  assert.equal(validRes.valid, true);

  const record = createRegistrationRecord({
    id: 'reg-1',
    competition: openTeamComp,
    isCustomProposal: false,
    customCabangName: '',
    satker: 'KUA Ampana Kota',
    namaTimAtauPeserta: 'Garuda KUA Ampana',
    ketuaAtauOfficial: 'H. Ahmad',
    kontakWhatsapp: '081234567890',
    nipAtauIdentitas: '198501012010011001',
    daftarPemain: ['Budi Santoso', 'Rizky Pratama'],
  });
  assert.equal(record.daftarPemain.length, 2);
  assert.equal(record.competitionName, 'Bola Voli Putra/Putri');
});

test('generateJalanSehatTicketNumber and generateQrMatrix produce deterministic valid outputs', () => {
  const ticket = generateJalanSehatTicketNumber(42, '7209051234560027');
  assert.equal(ticket, 'HAB81-TOUNA-0042-27');

  const matrix = generateQrMatrix(ticket);
  assert.equal(matrix.length, 21);
  assert.equal(matrix[0].length, 21);
  // Top-left finder corner must be 1
  assert.equal(matrix[0][0], 1);
  assert.equal(matrix[3][3], 1);
});

test('sortMedalStandings sorts by gold, silver, then bronze', () => {
  const standings: MedalStanding[] = [
    { id: '1', satker: 'KUA Ratolindo', emas: 2, perak: 4, perunggu: 1 },
    { id: '2', satker: 'MAN Tojo Una-Una', emas: 3, perak: 1, perunggu: 0 },
    { id: '3', satker: 'Kantor Kemenag Kab. Touna', emas: 3, perak: 2, perunggu: 2 },
  ];
  const sorted = sortMedalStandings(standings);
  assert.equal(sorted[0].satker, 'Kantor Kemenag Kab. Touna');
  assert.equal(sorted[1].satker, 'MAN Tojo Una-Una');
  assert.equal(sorted[2].satker, 'KUA Ratolindo');
});

test('pickLuckyDrawWinner only selects from unwon coupons', () => {
  const coupons: JalanSehatCoupon[] = [
    {
      id: 'c1',
      nomorKupon: 'HAB81-TOUNA-0001-01',
      namaPeserta: 'Peserta Menang',
      satkerAtauUmum: 'Umum',
      nikAtauNip: '123',
      noHp: '0811',
      waktuRegistrasi: '2026',
      sudahMenang: true,
    },
    {
      id: 'c2',
      nomorKupon: 'HAB81-TOUNA-0002-02',
      namaPeserta: 'Peserta Belum Menang',
      satkerAtauUmum: 'KUA Tojo',
      nikAtauNip: '456',
      noHp: '0812',
      waktuRegistrasi: '2026',
      sudahMenang: false,
    },
  ];
  const winner = pickLuckyDrawWinner(coupons, 0.5);
  assert.equal(winner?.id, 'c2');
});

test('validateImportedState rejects malformed payloads', () => {
  assert.equal(validateImportedState(null).valid, false);
  assert.equal(validateImportedState({ branding: {} }).valid, false);
});
