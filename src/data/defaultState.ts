import { AppState } from '../types/hab';

export const STORAGE_KEY = 'HABKEMENAGTOUNA_81_2027_STATE_V2';

export const DEFAULT_APP_STATE: AppState = {
  branding: {
    brandWordmark: 'HABKEMENAGTOUNA',
    tickerBadgeLabel: 'INFO PANITIA',
    navLabels: {
      beranda: 'Beranda 3D',
      peta: 'Peta Lokasi',
      lomba: 'Pendaftaran Lomba',
      jadwal: 'Jadwal & Baksos',
      kupon: 'Kupon Jalan Sehat',
      jurnal: 'Jurnal & Berita',
    },
    heroEyebrow: 'Kemenag RI · Kab. Tojo Una-Una',
    kemenagLogoPrimaryUrl:
      'https://raw.githubusercontent.com/Irfan45372/HABKEMENAGTOUNA/main/Kementerian-Agama.png',
    kemenagLogoFallbackUrl:
      'https://github.com/Irfan45372/HABKEMENAGTOUNA/blob/main/Kementerian-Agama.png?raw=true',
    habLogoCustomUrl: '',
    habLogoStatusBadge: 'Logo Sementara — Menunggu Rilis Resmi Pusat',
    showHabStatusBadge: true,
    officialTitle: 'Hari Amal Bakti ke-81 Kementerian Agama',
    officialSubtitle: 'Kantor Kementerian Agama Kabupaten Tojo Una-Una Tahun 2027',
    officialTagline:
      'Umat Rukun dan Sinergi, Indonesia Damai dan Maju — Bakti Kemenag Tojo Una-Una untuk Negeri',
    countdownHeading: 'Hitung Mundur Upacara Puncak HAB ke-81',
    countdownTargetLabel: 'Target: 03 Jan 2027 · 07:30 WITA',
    countdownTargetIso: '2027-01-03T07:30:00+08:00',
    runningTextItems: [
      'PENGUMUMAN PANITIA: Pendaftaran Cabang Lomba Olahraga, Seni, dan Keagamaan HAB ke-81 Kemenag Kab. Tojo Una-Una resmi dibuka secara daring untuk seluruh Satker, KUA Kecamatan Daratan & Kepulauan, Madrasah, Pondok Pesantren, dan DWP.',
      'JADWAL UTAMA: Upacara Puncak Peringatan Hari Amal Bakti ke-81 Kementerian Agama RI dilaksanakan pada Minggu, 3 Januari 2027 pukul 07:30 WITA di Halaman Kantor Kemenag Kab. Tojo Una-Una.',
      'JALAN SEHAT KERUKUNAN: Segera unduh Kupon QR Digital Jalan Sehat Kerukunan Lintas Agama & Doorprize Utama melalui portal resmi HABKEMENAGTOUNA.',
      'BAKTI SOSIAL: Kegiatan Donor Darah ASN, Santunan Yatim, dan Layanan Sertifikasi Halal Gratis berlangsung di Aula FKUB & Masjid Agung Ampana.',
    ],
    allowCustomCompetitionProposal: true,
    adminPin: '812027',
    welcomeVoice: {
      enabled: true,
      mode: 'tts',
      welcomeText:
        'Selamat datang di Portal Resmi Peringatan Hari Amal Bakti ke-81 Kementerian Agama Republik Indonesia, Kantor Kementerian Agama Kabupaten Tojo Una-Una Tahun 2027. Umat Rukun dan Sinergi, Indonesia Damai dan Maju.',
      audioUrl: '',
    },
  },
  satkerList: [
    'Kantor Kemenag Kab. Tojo Una-Una (Induk)',
    'DWP Kantor Kemenag Kab. Tojo Una-Una',
    'KUA Kec. Ampana Kota',
    'KUA Kec. Ratolindo',
    'KUA Kec. Ampana Tete',
    'KUA Kec. Ulubongka',
    'KUA Kec. Tojo',
    'KUA Kec. Tojo Barat',
    'KUA Kec. Una-Una (Kepulauan)',
    'KUA Kec. Togean (Kepulauan)',
    'KUA Kec. Walea Kepulauan',
    'KUA Kec. Walea Besar',
    'KUA Kec. Batudaka (Kepulauan)',
    'KUA Kec. Talatako (Kepulauan)',
    'MAN Tojo Una-Una',
    'MTsN 1 Tojo Una-Una',
    'MTsN 2 Tojo Una-Una',
    'MIN 1 Tojo Una-Una',
    'MIN 2 Tojo Una-Una',
    'KKM / Madrasah Swasta se-Kab. Tojo Una-Una',
    'Forum Pondok Pesantren se-Kab. Tojo Una-Una',
    'FKUB & Kontingen Lintas Agama Kab. Tojo Una-Una',
    'Penyuluh Agama & Penghulu se-Tojo Una-Una',
    'Masyarakat Umum / Mitra Kerukunan Touna',
  ],
  venues: [
    {
      id: 'venue-kantor-kemenag',
      nama: 'Kantor Kemenag Kab. Tojo Una-Una',
      kategoriTitik: 'Pusat Upacara & Sekretariat Panitia',
      alamat: 'Jl. Merdeka / Kompleks Perkantoran Bumi Mas, Ampana, Kab. Tojo Una-Una',
      latitude: -0.9125845029778236,
      longitude: 121.58667527394272,
      koordinatGps: '-0.9125845029778236, 121.58667527394272',
      googleMapsUrl: 'https://www.google.com/maps?q=-0.9125845029778236,121.58667527394272',
      deskripsi:
        'Lokasi pusat Sekretariat Panitia HAB ke-81, Upacara Bendera Puncak 3 Januari 2027, Lomba Tenis Meja, Catur, Domino Kerukunan, serta Lomba Kuliner Nusantara DWP.',
      kapasitas: '1.200 Peserta (Halaman Utama & Lapangan Dalam)',
    },
    {
      id: 'venue-start-jalan-sehat',
      nama: 'Titik Kumpul & Start Jalan Santai Kerukunan',
      kategoriTitik: 'Titik Start / Finish Jalan Santai',
      alamat: 'Halaman Depan Kantor Kemenag / Jalur Utama Menuju Taman JH Ampana',
      latitude: -0.9125845029778236,
      longitude: 121.58667527394272,
      koordinatGps: '-0.9125845029778236, 121.58667527394272',
      googleMapsUrl: 'https://www.google.com/maps?q=-0.9125845029778236,121.58667527394272',
      deskripsi:
        'Titik pertemuan peserta Jalan Santai / Jalan Sehat Kerukunan Lintas Agama pukul 06:00 WITA, registrasi kupon QR digital, senam pemanasan bersama, dan pelepasan peserta.',
      kapasitas: 'Kumpul 06:00 WITA · Start 06:30 WITA',
    },
    {
      id: 'venue-taman-jh',
      nama: 'Lapangan Taman JH Ampana & Koridor Pantai',
      kategoriTitik: 'Titik Finish & Panggung Undian Doorprize',
      alamat: 'Kel. Ampana, Kec. Ampana Kota, Tepi Teluk Tomini, Kab. Tojo Una-Una',
      latitude: -0.867912,
      longitude: 121.583421,
      koordinatGps: '-0.867912, 121.583421',
      googleMapsUrl: 'https://www.google.com/maps?q=-0.867912,121.583421',
      deskripsi:
        'Titik Finish Jalan Sehat Kerukunan Lintas Agama, Panggung Utama Pengundian Doorprize Kupon QR Digital, Senam Moderasi Beragama, dan Ekshibisi UMKM Halal.',
      kapasitas: '3.500 Peserta (Ruang Terbuka Publik)',
    },
    {
      id: 'venue-gor-ampana',
      nama: 'GOR Olahraga & Lapangan Voli/Futsal Ampana',
      kategoriTitik: 'Arena Lomba & Olahraga Porseni',
      alamat: 'Kec. Ratolindo / Ampana Kota, Kab. Tojo Una-Una',
      latitude: -0.88145,
      longitude: 121.57912,
      koordinatGps: '-0.881450, 121.579120',
      googleMapsUrl: 'https://www.google.com/maps?q=-0.881450,121.579120',
      deskripsi:
        'Arena pertandingan Porseni cabang Bulu Tangkis Beregu & Ganda, Bola Voli Putra/Putri, Futsal Antar-Satker, dan Sepak Takraw.',
      kapasitas: '800 Penonton & Kontingen Atlet',
    },
    {
      id: 'venue-aula-fkub',
      nama: 'Aula Utama Kemenag & Sekretariat FKUB Touna',
      kategoriTitik: 'Lokasi Bakti Sosial & Lomba Seni',
      alamat: 'Kompleks Kantor Kemenag Kab. Tojo Una-Una, Ampana',
      latitude: -0.9125845029778236,
      longitude: 121.58667527394272,
      koordinatGps: '-0.9125845029778236, 121.58667527394272',
      googleMapsUrl: 'https://www.google.com/maps?q=-0.9125845029778236,121.58667527394272',
      deskripsi:
        'Pusat Lomba Paduan Suara Mars Kemenag & Hymne Madrasah, Qasidah Rebana Klasik, Dialog Kerukunan Tokoh Lintas Agama, serta Donor Darah Sukarela PMI.',
      kapasitas: '450 Kursi Auditorium',
    },
    {
      id: 'venue-masjid-agung',
      nama: 'Masjid Agung & Pusat Pembinaan Keagamaan Ampana',
      kategoriTitik: 'Lokasi Kegiatan Keagamaan & Baksos',
      alamat: 'Pusat Kota Ampana, Kab. Tojo Una-Una',
      latitude: -0.87124,
      longitude: 121.58519,
      koordinatGps: '-0.871240, 121.585190',
      googleMapsUrl: 'https://www.google.com/maps?q=-0.871240,121.585190',
      deskripsi:
        'Lokasi MTQ / Tartil Al-Qur’an ASN & Pegawai, Zikir & Doa Bersama Tasyakuran HAB ke-81, serta Penyaluran Wakaf Al-Qur’an dan Santunan Anak Yatim.',
      kapasitas: '1.500 Jamaah',
    },
    {
      id: 'venue-kepulauan-togean',
      nama: 'Zona Satker Kepulauan (Wakai, Togean & Walea)',
      kategoriTitik: 'Titik Kumpul Kontingen Kepulauan',
      alamat: 'Kawasan Kepulauan Togean, Una-Una, Batudaka, Talatako & Walea',
      latitude: -0.41862,
      longitude: 121.86514,
      koordinatGps: '-0.418620, 121.865140',
      googleMapsUrl: 'https://www.google.com/maps?q=-0.418620,121.865140',
      deskripsi:
        'Titik pemberangkatan kontingen KUA & Madrasah wilayah Kepulauan menuju daratan Ampana serta lokasi Bakti Sosial Pesisir & Penilaian KUA/Madrasah Bersih.',
      kapasitas: '6 Kecamatan Kepulauan Terpadu',
    },
  ],
  competitions: [
    {
      id: 'comp-badminton',
      nama: 'Bulu Tangkis Ganda Putra & Putri Antar-Satker',
      kategori: 'Olahraga',
      jenisPeserta: 'Ganda',
      kuotaPemain: 2,
      statusPendaftaran: 'Buka',
      juknisUrl: '#juknis-badminton-hab81',
      jadwalRingkas: '14–17 Desember 2026',
      lokasiId: 'venue-gor-ampana',
      koordinator: 'Seksi Penmad & Panitia Olahraga',
      catatan: 'Wajib ASN/PPPK/Honorer aktif di lingkungan Kemenag Kab. Tojo Una-Una.',
    },
    {
      id: 'comp-voli',
      nama: 'Bola Voli Beregu Putra & Putri (Porseni HAB-81)',
      kategori: 'Olahraga',
      jenisPeserta: 'Beregu/Tim',
      kuotaPemain: 10,
      statusPendaftaran: 'Buka',
      juknisUrl: '#juknis-voli-hab81',
      jadwalRingkas: '15–20 Desember 2026',
      lokasiId: 'venue-gor-ampana',
      koordinator: 'Koordinator Cabang Bola Voli',
      catatan: 'Setiap kontingen terdiri atas 6 pemain inti dan maksimal 4 pemain cadangan.',
    },
    {
      id: 'comp-tenis-meja',
      nama: 'Tenis Meja Tunggal & Ganda Campuran',
      kategori: 'Olahraga',
      jenisPeserta: 'Perorangan/Individu',
      kuotaPemain: 1,
      statusPendaftaran: 'Buka',
      juknisUrl: '#juknis-tenismeja-hab81',
      jadwalRingkas: '16–18 Desember 2026',
      lokasiId: 'venue-kantor-kemenag',
      koordinator: 'Subbag TU Kemenag Touna',
      catatan: 'Sistem gugur best of 5 set sesuai peraturan PTMSI.',
    },
    {
      id: 'comp-futsal',
      nama: 'Futsal Kerukunan Antar-KUA, Madrasah & Ponpes',
      kategori: 'Olahraga',
      jenisPeserta: 'Beregu/Tim',
      kuotaPemain: 10,
      statusPendaftaran: 'Buka',
      juknisUrl: '#juknis-futsal-hab81',
      jadwalRingkas: '18–22 Desember 2026',
      lokasiId: 'venue-gor-ampana',
      koordinator: 'Seksi Bimas Islam & Pokjaluh',
      catatan: 'Menjunjung tinggi sportivitas dan silaturahmi antar-satker.',
    },
    {
      id: 'comp-takraw',
      nama: 'Sepak Takraw Regu Putra',
      kategori: 'Olahraga',
      jenisPeserta: 'Beregu/Tim',
      kuotaPemain: 5,
      statusPendaftaran: 'Buka',
      juknisUrl: '#juknis-takraw-hab81',
      jadwalRingkas: '19–21 Desember 2026',
      lokasiId: 'venue-kantor-kemenag',
      koordinator: 'Panitia Seksi Olahraga Tradisional',
      catatan: '3 pemain lapangan + 2 cadangan.',
    },
    {
      id: 'comp-catur',
      nama: 'Catur Cepat (Rapid Chess) 15 Menit',
      kategori: 'Olahraga',
      jenisPeserta: 'Perorangan/Individu',
      kuotaPemain: 1,
      statusPendaftaran: 'Buka',
      juknisUrl: '#juknis-catur-hab81',
      jadwalRingkas: '21–22 Desember 2026',
      lokasiId: 'venue-kantor-kemenag',
      koordinator: 'Penyelenggara Zakat & Wakaf',
      catatan: 'Menggunakan sistem Swiss 5 babak.',
    },
    {
      id: 'comp-paduan-suara',
      nama: 'Paduan Suara Mars Kemenag & Lagu Moderasi Beragama',
      kategori: 'Seni & Budaya',
      jenisPeserta: 'Beregu/Tim',
      kuotaPemain: 15,
      statusPendaftaran: 'Buka',
      juknisUrl: '#juknis-paduansuara-hab81',
      jadwalRingkas: '23 Desember 2026',
      lokasiId: 'venue-aula-fkub',
      koordinator: 'DWP Kemenag Kab. Tojo Una-Una',
      catatan: '1 Dirigen + 12 s.d. 14 penyanyi dengan busana adat / batik korpri rapi.',
    },
    {
      id: 'comp-qasidah',
      nama: 'Qasidah Rebana Klasik & Lagu Religi Nusantara',
      kategori: 'Seni & Budaya',
      jenisPeserta: 'Beregu/Tim',
      kuotaPemain: 11,
      statusPendaftaran: 'Buka',
      juknisUrl: '#juknis-qasidah-hab81',
      jadwalRingkas: '24 Desember 2026',
      lokasiId: 'venue-aula-fkub',
      koordinator: 'Seksi Bimas Islam & Majelis Taklim',
      catatan: 'Terbuka untuk DWP, Madrasah, KUA, dan Majelis Taklim binaan.',
    },
    {
      id: 'comp-mtq-asn',
      nama: 'MTQ / Tartil Al-Qur’an & Dakwah Moderasi ASN Pegawai',
      kategori: 'Keagamaan & Akademik',
      jenisPeserta: 'Perorangan/Individu',
      kuotaPemain: 1,
      statusPendaftaran: 'Buka',
      juknisUrl: '#juknis-mtq-hab81',
      jadwalRingkas: '26 Desember 2026',
      lokasiId: 'venue-masjid-agung',
      koordinator: 'LPTQ & Penghulu Kemenag Touna',
      catatan: 'Penilaian meliputi tajwid, fashahah, dan irama/lagu.',
    },
    {
      id: 'comp-kebersihan-kua',
      nama: 'Lomba KUA & Madrasah Bersih, Hijau, dan Ramah Layanan (K3)',
      kategori: 'Keagamaan & Akademik',
      jenisPeserta: 'Beregu/Tim',
      kuotaPemain: 5,
      statusPendaftaran: 'Buka',
      juknisUrl: '#juknis-k3-hab81',
      jadwalRingkas: '10–28 Desember 2026',
      lokasiId: 'venue-kepulauan-togean',
      koordinator: 'Tim Penilai Zona Integritas & Ortala',
      catatan: 'Verifikasi lapangan dan video profil pelayanan publik satker.',
    },
    {
      id: 'comp-kuliner-dwp',
      nama: 'Lomba Cipta Menu Kuliner Khas Tojo Una-Una (Nasi Kuning & Sinole)',
      kategori: 'Hiburan / Eksibisi',
      jenisPeserta: 'Beregu/Tim',
      kuotaPemain: 4,
      statusPendaftaran: 'Buka',
      juknisUrl: '#juknis-kuliner-hab81',
      jadwalRingkas: '29 Desember 2026',
      lokasiId: 'venue-kantor-kemenag',
      koordinator: 'Pengurus DWP Kemenag Kab. Touna',
      catatan: 'Mengutamakan bahan pangan lokal Tojo Una-Una yang sehat dan halal.',
    },
    {
      id: 'comp-tarik-tambang',
      nama: 'Tarik Tambang, Lari Karung & Domino Kerukunan',
      kategori: 'Hiburan / Eksibisi',
      jenisPeserta: 'Beregu/Tim',
      kuotaPemain: 8,
      statusPendaftaran: 'Buka',
      juknisUrl: '#juknis-hiburan-hab81',
      jadwalRingkas: '30 Desember 2026',
      lokasiId: 'venue-taman-jh',
      koordinator: 'Seksi Hiburan & Keakraban Keluarga Besar Kemenag',
      catatan: 'Digelar meriah usai Jalan Sehat Kerukunan.',
    },
  ],
  registrations: [
    {
      id: 'reg-seed-1',
      competitionId: 'comp-voli',
      competitionName: 'Bola Voli Beregu Putra & Putri (Porseni HAB-81)',
      kategori: 'Olahraga',
      jenisPeserta: 'Beregu/Tim',
      satker: 'MAN Tojo Una-Una',
      namaTimAtauPeserta: 'MAN Touna Spikers A',
      ketuaAtauOfficial: 'Drs. H. Syahruddin, M.Pd.I',
      kontakWhatsapp: '081341228891',
      nipAtauIdentitas: '197604122003121004',
      daftarPemain: [
        'Muh. Fadli Ladjamba',
        'Rizky Ramadhan',
        'Andi Saputra',
        'Hendra Wijaya',
        'Zulkifli T.',
        'Ilham Akbar',
        'Wahyu Pratama',
      ],
      catatanTambahan: 'Tim Putra Juara Bertahan Porseni HAB ke-80',
      waktuDaftar: '10 Nov 2026',
      statusVerifikasi: 'Terverifikasi',
    },
    {
      id: 'reg-seed-2',
      competitionId: 'comp-paduan-suara',
      competitionName: 'Paduan Suara Mars Kemenag & Lagu Moderasi Beragama',
      kategori: 'Seni & Budaya',
      jenisPeserta: 'Beregu/Tim',
      satker: 'DWP Kantor Kemenag Kab. Tojo Una-Una',
      namaTimAtauPeserta: 'Gita Bahana DWP Kemenag Touna',
      ketuaAtauOfficial: 'Ny. Hj. Siti Rahmawati',
      kontakWhatsapp: '085241990021',
      nipAtauIdentitas: 'DWP-TOUNA-01',
      daftarPemain: [
        'Ny. Hj. Siti Rahmawati (Dirigen)',
        'Hj. Nurhayati, S.Ag',
        'Siti Aminah, S.Pd.I',
        'Fatmawati Ladjamba',
        'Rosdiana M.',
        'Nurlaila Latief',
        'Rahmi Yanti',
      ],
      catatanTambahan: 'Membawakan Mars Kemenag & Lagu Moderasi Beragama aransemen 3 suara',
      waktuDaftar: '11 Nov 2026',
      statusVerifikasi: 'Terverifikasi',
    },
    {
      id: 'reg-seed-3',
      competitionId: 'comp-badminton',
      competitionName: 'Bulu Tangkis Ganda Putra & Putri Antar-Satker',
      kategori: 'Olahraga',
      jenisPeserta: 'Ganda',
      satker: 'KUA Kec. Ampana Kota',
      namaTimAtauPeserta: 'Pasangan Ganda Putra KUA Ampana Kota',
      ketuaAtauOfficial: 'Kepala KUA Ampana Kota',
      kontakWhatsapp: '082190887712',
      nipAtauIdentitas: '198408192009121002',
      daftarPemain: ['Ust. Irfan Ladjamba, S.H.I', 'Ahmad Fauzi, S.Sos'],
      catatanTambahan: 'Ganda Putra Unggulan Pool A',
      waktuDaftar: '12 Nov 2026',
      statusVerifikasi: 'Terverifikasi',
    },
    {
      id: 'reg-seed-4',
      competitionId: 'comp-mtq-asn',
      competitionName: 'MTQ / Tartil Al-Qur’an & Dakwah Moderasi ASN Pegawai',
      kategori: 'Keagamaan & Akademik',
      jenisPeserta: 'Perorangan/Individu',
      satker: 'KUA Kec. Una-Una (Kepulauan)',
      namaTimAtauPeserta: 'Ust. Muhammad Al-Fatih, S.Ag',
      ketuaAtauOfficial: 'KUA Kec. Una-Una (Kepulauan)',
      kontakWhatsapp: '081245667123',
      nipAtauIdentitas: '198811032019031005',
      daftarPemain: ['Ust. Muhammad Al-Fatih, S.Ag'],
      catatanTambahan: 'Maqra Surah Al-Hujurat ayat 10–13 tentang Persaudaraan & Kerukunan',
      waktuDaftar: '14 Nov 2026',
      statusVerifikasi: 'Terverifikasi',
    },
  ],
  matches: [
    {
      id: 'match-1',
      competitionId: 'comp-voli',
      competitionName: 'Bola Voli Beregu Putra',
      babak: 'Penyisihan Grup A',
      kontingenA: 'Kantor Kemenag Kab. Touna',
      kontingenB: 'MAN Tojo Una-Una',
      skorA: '2',
      skorB: '1',
      waktu: '15 Des 2026 • 15:30 WITA',
      lokasi: 'GOR Olahraga Ampana',
      status: 'Sedang Berlangsung',
    },
    {
      id: 'match-2',
      competitionId: 'comp-badminton',
      competitionName: 'Bulu Tangkis Ganda Putra',
      babak: 'Perempat Final',
      kontingenA: 'KUA Kec. Ampana Kota',
      kontingenB: 'MTsN 1 Tojo Una-Una',
      skorA: '21 - 18, 21 - 16',
      skorB: '0 - 2',
      waktu: '16 Des 2026 • 19:30 WITA',
      lokasi: 'GOR Olahraga Ampana',
      status: 'Selesai',
    },
    {
      id: 'match-3',
      competitionId: 'comp-futsal',
      competitionName: 'Futsal Kerukunan Antar-Satker',
      babak: 'Semifinal',
      kontingenA: 'Gabungan KUA Kepulauan',
      kontingenB: 'KUA Kec. Ratolindo',
      skorA: '3',
      skorB: '3 (Pen 4-3)',
      waktu: '19 Des 2026 • 16:00 WITA',
      lokasi: 'GOR Olahraga Ampana',
      status: 'Selesai',
    },
    {
      id: 'match-4',
      competitionId: 'comp-tenis-meja',
      competitionName: 'Tenis Meja Tunggal Putra',
      babak: 'Final Perebutan Emas',
      kontingenA: 'MIN 1 Tojo Una-Una',
      kontingenB: 'KUA Kec. Tojo',
      skorA: 'VS',
      skorB: 'VS',
      waktu: '18 Des 2026 • 09:00 WITA',
      lokasi: 'Halaman Kantor Kemenag Touna',
      status: 'Terjadwal',
    },
  ],
  medalStandings: [
    {
      id: 'med-1',
      satker: 'Kantor Kemenag Kab. Tojo Una-Una (Induk)',
      emas: 4,
      perak: 2,
      perunggu: 3,
    },
    {
      id: 'med-2',
      satker: 'MAN Tojo Una-Una',
      emas: 3,
      perak: 3,
      perunggu: 2,
    },
    {
      id: 'med-3',
      satker: 'KUA Kec. Ampana Kota',
      emas: 3,
      perak: 1,
      perunggu: 2,
    },
    {
      id: 'med-4',
      satker: 'MTsN 1 Tojo Una-Una',
      emas: 2,
      perak: 2,
      perunggu: 1,
    },
    {
      id: 'med-5',
      satker: 'DWP Kantor Kemenag Kab. Tojo Una-Una',
      emas: 2,
      perak: 1,
      perunggu: 2,
    },
    {
      id: 'med-6',
      satker: 'Gabungan KUA Kepulauan (Togean, Una-Una, Walea)',
      emas: 1,
      perak: 3,
      perunggu: 2,
    },
  ],
  schedules: [
    {
      id: 'sch-1',
      judul: 'Rapat Koordinasi Panitia Inti & Finalisasi Juknis HAB ke-81',
      kategori: 'Rapat/Persiapan',
      tanggal: '2026-12-05',
      waktu: '09:00 - 12:00 WITA',
      lokasiId: 'venue-aula-fkub',
      lokasiNama: 'Aula Utama Kemenag & Sekretariat FKUB Touna',
      pic: 'Ketua Panitia HAB ke-81 & Kasubbag TU',
      status: 'Selesai',
      catatan: 'Penetapan cabang lomba olahraga, seni, keagamaan, dan kuota kontingen satker.',
    },
    {
      id: 'sch-2',
      judul: 'Apel Pembukaan Porseni HAB ke-81 & Pelepasan balon Kerukunan',
      kategori: 'Porseni & Lomba',
      tanggal: '2026-12-14',
      waktu: '07:30 - 10:30 WITA',
      lokasiId: 'venue-kantor-kemenag',
      lokasiNama: 'Kantor Kemenag Kab. Tojo Una-Una',
      pic: 'Kepala Kantor Kemenag Kab. Tojo Una-Una',
      status: 'Sedang Berlangsung',
      catatan: 'Diikuti oleh seluruh kontingen KUA Daratan & Kepulauan, Madrasah Negeri/Swasta, dan Ponpes.',
    },
    {
      id: 'sch-3',
      judul: 'Bakti Sosial Donor Darah ASN, Layanan Halal Gratis & Santunan Yatim',
      kategori: 'Bakti Sosial',
      tanggal: '2026-12-27',
      waktu: '08:00 - 14:00 WITA',
      lokasiId: 'venue-masjid-agung',
      lokasiNama: 'Masjid Agung & Pusat Pembinaan Keagamaan Ampana',
      pic: 'Penyelenggara Zakat Wakaf, Bimas & PMI Touna',
      status: 'Terjadwal',
      catatan: 'Terbuka untuk seluruh pegawai Kemenag dan masyarakat Kabupaten Tojo Una-Una.',
    },
    {
      id: 'sch-4',
      judul: 'Jalan Sehat Kerukunan Umat Beragama & Pengundian Kupon QR Digital',
      kategori: 'Jalan Sehat Kerukunan',
      tanggal: '2026-12-30',
      waktu: '06:30 - 11:30 WITA',
      lokasiId: 'venue-taman-jh',
      lokasiNama: 'Lapangan Taman JH Ampana & Koridor Pantai',
      pic: 'FKUB Tojo Una-Una & Seksi Jalan Sehat',
      status: 'Terjadwal',
      catatan: 'Peserta wajib membawa Kupon QR Digital (cetak atau tampilkan di layar HP) untuk undian panggung.',
    },
    {
      id: 'sch-5',
      judul: 'Zikir, Doa Bersama Lintas Agama & Malam Tasyakuran HAB ke-81',
      kategori: 'Upacara & Kenegaraan',
      tanggal: '2027-01-02',
      waktu: '19:30 - 22:00 WITA',
      lokasiId: 'venue-aula-fkub',
      lokasiNama: 'Aula Utama Kemenag & Sekretariat FKUB Touna',
      pic: 'Seksi Keagamaan & Tokoh Lintas Agama',
      status: 'Terjadwal',
      catatan: 'Refleksi pengabdian 81 tahun Kementerian Agama melayani umat di Bumi Sivia Patuju.',
    },
    {
      id: 'sch-6',
      judul: 'Upacara Bendera Puncak Peringatan Hari Amal Bakti ke-81 Kementerian Agama RI',
      kategori: 'Upacara & Kenegaraan',
      tanggal: '2027-01-03',
      waktu: '07:30 - 11:00 WITA',
      lokasiId: 'venue-kantor-kemenag',
      lokasiNama: 'Kantor Kemenag Kab. Tojo Una-Una',
      pic: 'Bupati Tojo Una-Una / Kepala Kantor Kemenag Kab. Touna',
      status: 'Terjadwal',
      catatan: 'Penyematan Tanda Kehormatan Satyalancana Karya Satya & Penyerahan Piala Juara Umum HAB ke-81.',
    },
  ],
  baksosMetrics: [
    {
      id: 'baksos-1',
      namaProgram: 'Donor Darah Sukarela ASN & Masyarakat',
      target: 150,
      capaian: 118,
      satuan: 'Kantong Darah',
      lokasi: 'Aula Kemenag Touna & PMI Ampana',
      koordinator: 'dr. Tim Medis PMI & Subbag TU',
    },
    {
      id: 'baksos-2',
      namaProgram: 'Paket Sembako Kasih & Moderasi Beragama',
      target: 500,
      capaian: 435,
      satuan: 'Paket Sembako',
      lokasi: '12 Kecamatan Daratan & Kepulauan Touna',
      koordinator: 'UPZ Kemenag Touna & DWP',
    },
    {
      id: 'baksos-3',
      namaProgram: 'Santunan Anak Yatim, Piatu & Pondok Pesantren',
      target: 250,
      capaian: 210,
      satuan: 'Penerima Manfaat',
      lokasi: 'Masjid Agung Ampana & Ponpes se-Touna',
      koordinator: 'Penyelenggara Zakat & Wakaf',
    },
    {
      id: 'baksos-4',
      namaProgram: 'Pendampingan Sertifikasi Halal UMKM Gratis (SEHATI)',
      target: 300,
      capaian: 264,
      satuan: 'Sertifikat UMKM',
      lokasi: 'Taman JH Ampana & KUA Kecamatan',
      koordinator: 'Satgas Halal & Penyuluh Agama Touna',
    },
    {
      id: 'baksos-5',
      namaProgram: 'Wakaf Al-Qur’an & Kitab Suci Rumah Ibadah',
      target: 1000,
      capaian: 820,
      satuan: 'Mushaf / Kitab',
      lokasi: 'Rumah Ibadah Daratan & Kepulauan Togean',
      koordinator: 'Bimas Islam, Kristen, Katolik, Hindu, Buddha',
    },
  ],
  coupons: [
    {
      id: 'cpn-seed-1',
      nomorKupon: 'HAB81-TOUNA-0001-81',
      namaPeserta: 'H. Muh. Syahrir, S.Ag., M.H.',
      satkerAtauUmum: 'Kantor Kemenag Kab. Tojo Una-Una (Induk)',
      nikAtauNip: '197403112000031002',
      noHp: '081241008181',
      waktuRegistrasi: '10 Nov 2026, 08:15 WITA',
      sudahMenang: false,
    },
    {
      id: 'cpn-seed-3',
      nomorKupon: 'HAB81-TOUNA-0002-29',
      namaPeserta: 'Irfan, S.Kom',
      satkerAtauUmum: 'Kantor Kemenag Kab. Tojo Una-Una (Induk)',
      nikAtauNip: '199205212020121008',
      noHp: '082291453729',
      waktuRegistrasi: '12 Nov 2026, 10:12 WITA',
      sudahMenang: false,
    },
  ],
  messages: [
    {
      id: 'msg-1',
      nama: 'Keluarga Besar Subbag TU & Seksi Kemenag Touna',
      jabatanAtauSatker: 'Kantor Kemenag Kab. Tojo Una-Una',
      kategori: 'Ucapan Selamat HAB ke-81',
      pesan:
        'Dirgahayu Hari Amal Bakti ke-81 Kementerian Agama RI Tahun 2027. Semoga Kemenag Kabupaten Tojo Una-Una senantiasa menjadi garda terdepan merawat kerukunan umat di Bumi Sivia Patuju, baik di wilayah daratan maupun kepulauan.',
      waktu: '14 Nov 2026',
      disetujui: true,
    },
    {
      id: 'msg-2',
      nama: 'Forum Kepala KUA Daratan & Kepulauan Togean',
      jabatanAtauSatker: 'KUA se-Kabupaten Tojo Una-Una',
      kategori: 'Doa Kerukunan Umat',
      pesan:
        'Dari Ampana hingga Wakai, Togean, dan Walea, kami siap menyukseskan Porseni, Bakti Sosial, dan Jalan Sehat Kerukunan HAB ke-81 Kemenag Tahun 2027. Umat Rukun, Tojo Una-Una Maju!',
      waktu: '15 Nov 2026',
      disetujui: true,
    },
    {
      id: 'msg-3',
      nama: 'Civitas Akademika MAN, MTsN & MIN se-Touna',
      jabatanAtauSatker: 'Madrasah Mandiri Berprestasi Tojo Una-Una',
      kategori: 'Aspirasi & Saran Panitia',
      pesan:
        'Apresiasi setinggi-tingginya kepada Panitia HAB ke-81 atas sistem pendaftaran lomba dan kupon QR digital yang transparan dan memudahkan kontingen madrasah.',
      waktu: '16 Nov 2026',
      disetujui: true,
    },
  ],
  videos: [
    {
      id: 'vid-1',
      judul: 'Profil Pelayanan Publik & Zona Integritas Kantor Kemenag Kab. Tojo Una-Una',
      satker: 'Kantor Kemenag Kab. Tojo Una-Una (Induk)',
      kategori: 'Profil & Inovasi Satker',
      sumberipe: 'youtube',
      youtubeUrl: 'https://www.youtube.com/watch?v=ysz5S6PUM-U',
      durasiLabel: '03:45',
      deskripsi:
        'Tayangan resmi profil pelayanan terpadu, moderasi beragama, dan inovasi layanan keagamaan di wilayah daratan Ampana serta Kepulauan Togean & Walea.',
      waktuUpload: '15 Nov 2026',
      disetujui: true,
    },
    {
      id: 'vid-2',
      judul: 'Semarak Persiapan Porseni & Jalan Sehat Kerukunan HAB ke-81 Tahun 2027',
      satker: 'FKUB & Kontingen Lintas Agama Kab. Tojo Una-Una',
      kategori: 'Dokumentasi Porseni & Baksos',
      sumberipe: 'youtube',
      youtubeUrl: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
      durasiLabel: '02:15',
      deskripsi:
        'Dokumentasi kebersamaan seluruh Satker KUA, Madrasah, Pondok Pesantren, dan tokoh lintas agama menyambut Hari Amal Bakti ke-81 Kementerian Agama.',
      waktuUpload: '16 Nov 2026',
      disetujui: true,
    },
  ],
  satkerBanners: [
    {
      id: 'bnr-seed-1',
      satker: 'Kantor Kemenag Kab. Tojo Una-Una (Induk)',
      kategori: 'Spanduk & Banner Ucapan',
      judul: 'Spanduk Utama Sukseskan HAB ke-81 Kementerian Agama RI Tahun 2027',
      imageUrl: `data:image/svg+xml;utf8,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500">
          <defs>
            <linearGradient id="bg1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#022c22"/>
              <stop offset="55%" stop-color="#064e3b"/>
              <stop offset="100%" stop-color="#021b15"/>
            </linearGradient>
          </defs>
          <rect width="1200" height="500" fill="url(#bg1)"/>
          <rect x="24" y="24" width="1152" height="452" rx="18" fill="none" stroke="#fbbf24" stroke-width="3" stroke-opacity="0.65"/>
          <circle cx="150" cy="250" r="82" fill="#03251c" stroke="#fbbf24" stroke-width="4"/>
          <text x="150" y="268" text-anchor="middle" fill="#fbbf24" font-family="sans-serif" font-weight="800" font-size="56">81</text>
          <text x="275" y="155" fill="#fde68a" font-family="sans-serif" font-weight="700" font-size="24" letter-spacing="2">KANTOR KEMENTERIAN AGAMA KABUPATEN TOJO UNA-UNA</text>
          <text x="275" y="235" fill="#ffffff" font-family="sans-serif" font-weight="800" font-size="44">DIRGAHAYU HARI AMAL BAKTI KE-81</text>
          <text x="275" y="295" fill="#34d399" font-family="sans-serif" font-weight="700" font-size="28">Umat Rukun dan Sinergi, Indonesia Damai dan Maju</text>
          <text x="275" y="365" fill="#cbd5e1" font-family="sans-serif" font-size="21">3 Januari 1946 — 3 Januari 2027 · Bumi Sivia Patuju, Ampana &amp; Kepulauan Togean</text>
        </svg>`
      )}`,
      bannerUcapan:
        'Keluarga Besar Kantor Kemenag Kab. Tojo Una-Una mengucapkan Selamat Hari Amal Bakti ke-81 Kementerian Agama RI Tahun 2027.',
      keterangan: 'Spanduk resmi Sekretariat Panitia HAB ke-81 di Kompleks Perkantoran Bumi Mas Ampana.',
      waktuUpload: '15 Nov 2026',
      disetujui: true,
    },
    {
      id: 'bnr-seed-2',
      satker: 'MAN Tojo Una-Una',
      kategori: 'Persiapan Lomba',
      judul: 'Persiapan Kontingen Olahraga & Seni Madrasah Aliyah Negeri Tojo Una-Una',
      imageUrl: `data:image/svg+xml;utf8,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500">
          <defs>
            <linearGradient id="bg2" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#042f2e"/>
              <stop offset="100%" stop-color="#022c22"/>
            </linearGradient>
          </defs>
          <rect width="1200" height="500" fill="url(#bg2)"/>
          <rect x="28" y="28" width="1144" height="444" rx="18" fill="none" stroke="#34d399" stroke-width="2" stroke-opacity="0.5"/>
          <text x="600" y="160" text-anchor="middle" fill="#fbbf24" font-family="sans-serif" font-weight="700" font-size="24">PERSIAPAN LOMBA &amp; PORSENI HAB KE-81</text>
          <text x="600" y="240" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="800" font-size="42">MAN TOJO UNA-UNA SIAP SUKSESKAN PORSENI HAB KE-81</text>
          <text x="600" y="310" text-anchor="middle" fill="#a7f3d0" font-family="sans-serif" font-weight="600" font-size="26">Cabang Bola Voli, Bulu Tangkis, Tenis Meja &amp; Paduan Suara Mars Kemenag</text>
          <text x="600" y="380" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="20">Sportivitas Tinggi · Merajut Silaturahmi Keluarga Besar Kemenag Touna</text>
        </svg>`
      )}`,
      bannerUcapan:
        'Siap menjunjung tinggi sportivitas dan merajut kebersamaan pada Porseni HAB ke-81 Tahun 2027!',
      keterangan: 'Latihan rutin tim voli dan paduan suara guru/pegawai MAN Tojo Una-Una.',
      waktuUpload: '16 Nov 2026',
      disetujui: true,
    },
    {
      id: 'bnr-seed-3',
      satker: 'DWP Kantor Kemenag Kab. Tojo Una-Una',
      kategori: 'Baksos',
      judul: 'Aksi Bakti Sosial Paket Sembako Kasih & Santunan Pondok Pesantren',
      imageUrl: `data:image/svg+xml;utf8,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500">
          <defs>
            <linearGradient id="bg3" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#064e3b"/>
              <stop offset="100%" stop-color="#021b15"/>
            </linearGradient>
          </defs>
          <rect width="1200" height="500" fill="url(#bg3)"/>
          <rect x="28" y="28" width="1144" height="444" rx="18" fill="none" stroke="#fbbf24" stroke-width="2" stroke-opacity="0.5"/>
          <text x="600" y="160" text-anchor="middle" fill="#fde68a" font-family="sans-serif" font-weight="700" font-size="24">PEDULI UMAT &amp; BAKTI SOSIAL HAB KE-81</text>
          <text x="600" y="240" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="800" font-size="40">PENYALURAN SEMBAKO KASIH &amp; DONOR DARAH ASN</text>
          <text x="600" y="310" text-anchor="middle" fill="#34d399" font-family="sans-serif" font-weight="600" font-size="25">Dharma Wanita Persatuan &amp; UPZ Kemenag Kabupaten Tojo Una-Una</text>
          <text x="600" y="380" text-anchor="middle" fill="#cbd5e1" font-family="sans-serif" font-size="20">Menjangkau Masyarakat Daratan Ampana hingga Kepulauan Togean &amp; Walea</text>
        </svg>`
      )}`,
      bannerUcapan:
        'Berbagi berkah dan kepedulian nyata untuk masyarakat Kabupaten Tojo Una-Una.',
      keterangan: 'Dokumentasi penyaluran paket sembako dan santunan yatim bersama DWP & UPZ.',
      waktuUpload: '18 Nov 2026',
      disetujui: true,
    },
    {
      id: 'bnr-seed-4',
      satker: 'KUA Kec. Wakai / Una-Una (Kepulauan)',
      kategori: 'Kunjungan Kerja',
      judul: 'Kunjungan Kerja & Pembinaan Layanan Keagamaan Wilayah Kepulauan Togean',
      imageUrl: `data:image/svg+xml;utf8,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 500">
          <defs>
            <linearGradient id="bg4" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#022c22"/>
              <stop offset="100%" stop-color="#0f3f35"/>
            </linearGradient>
          </defs>
          <rect width="1200" height="500" fill="url(#bg4)"/>
          <rect x="28" y="28" width="1144" height="444" rx="18" fill="none" stroke="#6ee7b7" stroke-width="2" stroke-opacity="0.5"/>
          <text x="600" y="160" text-anchor="middle" fill="#fbbf24" font-family="sans-serif" font-weight="700" font-size="24">KUNJUNGAN KERJA &amp; MONITORING KEPULAUAN</text>
          <text x="600" y="240" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="800" font-size="40">SINERGI PELAYANAN KUA KEPULAUAN TOGEAN &amp; WALEA</text>
          <text x="600" y="310" text-anchor="middle" fill="#a7f3d0" font-family="sans-serif" font-weight="600" font-size="25">Koordinasi Kontingen Kepulauan Menuju Semarak HAB ke-81 di Ampana</text>
          <text x="600" y="380" text-anchor="middle" fill="#cbd5e1" font-family="sans-serif" font-size="20">KUA Una-Una · KUA Togean · KUA Walea Kepulauan · KUA Walea Besar · KUA Batudaka · KUA Talatako</text>
        </svg>`
      )}`,
      bannerUcapan:
        'Kontingen KUA Kepulauan siap menyukseskan seluruh rangkaian HAB ke-81 Kemenag Tojo Una-Una!',
      keterangan: 'Kunjungan kerja pembinaan ASN dan koordinasi pemberangkatan kontingen kepulauan.',
      waktuUpload: '19 Nov 2026',
      disetujui: true,
    },
  ],
  journals: [
    {
      id: 'jrn-seed-1',
      judul:
        'Kemenag Tojo Una-Una Matangkan Persiapan HAB ke-81 Tahun 2027, Usung Semangat “Kemenag Berdampak”',
      kategoriLokasi: 'TOJO UNA UNA',
      penulis: 'Tim Humas Kemenag Tojo Una-Una',
      satker: 'Kantor Kemenag Kab. Tojo Una-Una (Induk)',
      tanggalWaktu: 'Kamis, 05 November 2026 - 14:54 WITA',
      leadParagraf:
        'HUMAS, TOJO UNA UNA – Kantor Kementerian Agama (Kemenag) Kabupaten Tojo Una-Una mulai bergerak cepat mematangkan persiapan pelaksanaan Hari Amal Bakti (HAB) Kemenag ke-81 Tahun 2027. Langkah awal ini ditandai dengan digelarnya rapat koordinasi jajaran pejabat dan satuan kerja di Ruang Rapat Kantor Kemenag Tojo Una-Una.',
      isiBerita:
        'Rapat strategis tersebut dipimpin langsung oleh Kepala Kantor Kemenag Tojo Una-Una bersama Kasubbag Tata Usaha, para Kepala Seksi dan Penyelenggara, Kepala Madrasah Negeri, Kepala KUA Kecamatan daratan maupun kepulauan, Pengawas Madrasah, serta Jabatan Fungsional Tertentu (JFT) di lingkungan Kemenag Tojo Una-Una.\n\nDalam arahannya, pimpinan menegaskan bahwa peringatan Hari Amal Bakti ke-81 Tahun 2027 harus mengusung semangat “Kemenag Berdampak” yang tidak hanya meriah melalui ajang Pekan Olahraga dan Seni (Porseni) antar-Satker, tetapi juga menghadirkan manfaat nyata bagi masyarakat luas melalui program Bakti Sosial lintas agama, layanan sertifikasi halal gratis, donor darah ASN, serta santunan yatim dan dhuafa.\n\nSeluruh satuan kerja baik di wilayah daratan Ampana maupun wilayah kepulauan Togean dan Walea berkomitmen penuh menyukseskan agenda tahunan ini sebagai momentum memperkokoh kerukunan umat beragama dan meningkatkan kualitas layanan publik di Kabupaten Tojo Una-Una.',
      photos: [
        `data:image/svg+xml;utf8,${encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675">
            <defs>
              <linearGradient id="jbg1" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#064e3b"/>
                <stop offset="50%" stop-color="#042f24"/>
                <stop offset="100%" stop-color="#021b15"/>
              </linearGradient>
            </defs>
            <rect width="1200" height="675" fill="url(#jbg1)"/>
            <rect x="36" y="36" width="1128" height="603" rx="20" fill="none" stroke="#fbbf24" stroke-width="3" stroke-opacity="0.6"/>
            <text x="600" y="210" text-anchor="middle" fill="#fbbf24" font-family="sans-serif" font-weight="800" font-size="26" letter-spacing="2">JURNAL RESMI HUMAS KEMENAG TOJO UNA-UNA</text>
            <text x="600" y="300" text-anchor="middle" fill="#ffffff" font-family="Georgia, serif" font-weight="800" font-size="44">RAPAT KOORDINASI PERSIAPAN HAB KE-81</text>
            <text x="600" y="365" text-anchor="middle" fill="#a7f3d0" font-family="sans-serif" font-weight="700" font-size="30">Mengusung Semangat “Kemenag Berdampak” Tahun 2027</text>
            <text x="600" y="450" text-anchor="middle" fill="#fde68a" font-family="sans-serif" font-weight="600" font-size="22">Kantor Kementerian Agama Kabupaten Tojo Una-Una · Ampana</text>
          </svg>`
        )}`,
        `data:image/svg+xml;utf8,${encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675">
            <rect width="1200" height="675" fill="#03251c"/>
            <rect x="36" y="36" width="1128" height="603" rx="20" fill="none" stroke="#34d399" stroke-width="2" stroke-opacity="0.5"/>
            <text x="600" y="260" text-anchor="middle" fill="#fde68a" font-family="sans-serif" font-weight="700" font-size="28">DOKUMENTASI KEGIATAN #2</text>
            <text x="600" y="340" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="800" font-size="38">SINERGI JAJARAN PEJABAT, KEPALA KUA &amp; MADRASAH</text>
            <text x="600" y="410" text-anchor="middle" fill="#a7f3d0" font-family="sans-serif" font-size="24">Pembentukan Panitia Pelaksana HAB ke-81 Kemenag Tojo Una-Una</text>
          </svg>`
        )}`,
      ],
      captionFotoUtama:
        'Suasana rapat pematangan persiapan Hari Amal Bakti (HAB) ke-81 Kementerian Agama Kabupaten Tojo Una-Una.',
      disetujui: true,
    },
  ],
};


