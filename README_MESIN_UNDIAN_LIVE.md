# Panduan Teknis Operator — Mesin Undian Live & YouTube Streaming
**Portal Resmi Peringatan Hari Amal Bakti (HAB) Ke-81 Kementerian Agama Kabupaten Tojo Una-Una Tahun 2027**

Dokumen ini menjelaskan alur kerja teknis bagi **Admin / Panitia Operator** untuk menjalankan **Mesin Undian Full Lomba (Pool/Grup & Bagan Sistem Gugur)** maupun **Mesin Undian Nomor Urut Tampil** yang terpadu dengan **Live Streaming YouTube** dan sinkronisasi **Real-Time Cloud Firestore**.

---

## Arsitektur Singkat Sistem
- **Sumber Data & Sinkronisasi Real-Time:** Cloud Firestore (`portalConfig/main` → `branding.liveDrawYoutubeUrl` dan `tournamentDraws[]`) dengan cadangan cache lokal (`localStorage`). Setiap pengundian, penyuntingan, atau penghapusan oleh Admin langsung terlihat secara *real-time* di seluruh perangkat kontingen/penonton tanpa perlu me-refresh halaman.
- **Keamanan Pengacakan:** Menggunakan algoritma *Fisher-Yates Shuffle* berbasis `window.crypto.getRandomValues` (bila tersedia pada browser modern) untuk hasil undian yang adil dan bebas bias.
- **Video Live Streaming:** Menggunakan **YouTube Live Embed (`<iframe>`)** sehingga beban video ditangani oleh server YouTube, sementara papan pengundian & hasil berjalan ringan langsung di browser.

---

## Langkah 1 — Menyiapkan Siaran Live YouTube
Admin dapat memilih salah satu dari dua metode penyiaran sesuai kebutuhan panitia:

### Metode A: Live Kamera HP / Studio Panitia (Paling Praktis)
1. Buka aplikasi **YouTube** di HP panitia → tekan ikon **(+)** → pilih **Live Streaming**.
2. Arahkan kamera ke meja MC / pimpinan *Technical Meeting* agar peserta mendengar suara penjelasan panitia secara langsung.
3. Setelah siaran siap/aktif, tekan **Bagikan (Share)** → **Salin Link** (format `https://youtube.com/live/...` atau `https://youtu.be/...`).

### Metode B: Live Rekam Layar Laptop via OBS Studio (Menampilkan Mesin Undian ke YouTube)
1. Buka **OBS Studio** di laptop operator.
2. Pada panel **Sources**, klik **(+)** → pilih **Window Capture** atau **Display Capture** dan arahkan ke jendela browser yang membuka menu **Mesin Undian Live** di website ini.
3. Tambahkan **Audio Input Capture** (mikrofon panitia/MC).
4. Buka YouTube Studio → **Go Live** → salin *Stream Key* ke OBS → klik **Start Streaming** di OBS.
5. Salin **Link Tonton YouTube Live** (`youtube.com/live/...` atau `youtube.com/watch?v=...`).

---

## Langkah 2 — Menyalin & Menayangkan Link YouTube di Mesin Undian Website
1. Buka portal website → masuk ke menu **Pendaftaran Lomba & Klasemen** → klik tab **`Mesin Undian Live`**.
2. Klik tombol **`Buka Kontrol Admin (PIN)`** di pojok kanan atas panel lalu masukkan PIN Admin. *(Catatan: Tombol **`Panduan Teknis (README)`** hanya tampil untuk Admin setelah PIN dibuka).*
3. Pada panel sebelah kiri (**Layar Siaran Langsung / YouTube Live**):
   - **Opsi 1 (Ambil dari Link yang Sudah Disimpan Sebelumnya):** Jika Admin sudah menyimpan link YouTube di menu **`05. Galeri Video`** (kategori *Live Streaming & Upacara* atau kategori lainnya), cukup pilih video tersebut pada dropdown **`Ambil Link YouTube yang Sudah Tersimpan di Galeri Video`**. Link langsung terpasang otomatis.
   - **Opsi 2 (Copy-Paste Manual Link Baru):** Tempel (*paste*) link YouTube Live langsung ke kolom **`Tempel / Copy Link YouTube Live Secara Langsung`**, lalu klik **`Tayangkan`**.
4. Pemutar video YouTube Live hanya muncul untuk semua peserta dan pengunjung website **selama link ditayangkan oleh Admin**. Jika siaran sudah selesai atau belum ada acara live, klik tombol **`Netralkan Layar`** agar layar kembali standby (*Tidak Ada Video / Siaran Live Saat Ini*). Pengguna di HP dapat menekan tombol **`Layar Penuh (HP)`** untuk menonton **Video Penuh** atau **Live + Hasil Undian** satu layar penuh di HP.
5. *(Opsional)* Klik tombol **`Salin Link Undian`** di bagian atas untuk membagikan link langsung ke halaman Undian Live (`?menu=lomba&undian=1`) ke grup WhatsApp Kontingen.

---

## Langkah 3 — Cara Admin Mengambil Data atau Mengetik Daftar Tim Manual
Saat *Technical Meeting*, jenis olahraga atau lomba sering kali perlu dipecah lebih rinci (misalnya *Bola Voli Putra*, *Bola Voli Putri*, *Bulu Tangkis Ganda Putra*, *Bulu Tangkis Ganda Putri*, *Tenis Meja Tunggal*, *MTQ Golongan ASN*, dll.) atau ada tim yang baru mendaftar/bergabung di tempat.

Untuk itu, panel **`Input & Mesin Undian Manual (Operator)`** mendukung dua cara pengisian daftar tim/peserta:

### Cara 1: Ketik / Tempel Manual (100% Bebas)
1. Pada kolom **`Nama Jenis Olahraga / Lomba (Ketik Bebas)`**, ketik nama spesifik cabang/kelas yang sedang diundi (contoh: `Bola Voli Putra Antar-Satker`).
2. Pilih **Kategori Induk**: `Olahraga` atau `Lomba`.
3. Pada kotak teks **`Ketik / Tempel Daftar Tim / Peserta (1 Baris = 1 Tim/Peserta)`**, ketik atau *copy-paste* daftar nama tim/peserta dari Excel/Word/WhatsApp.
   - Aturan format: **1 baris = 1 tim atau peserta**.
   - Baris kosong dan duplikat persis otomatis diabaikan; penghitung **`N Tim/Peserta Siap Diundi`** di kanan atas akan memperlihatkan jumlah tim valid.

### Cara 2: Mengambil Cepat dari Data Website (Lalu Edit Manual)
Jika tim/peserta sudah mendaftar lewat website sebelumnya:
1. Pada kotak **`Alat Bantu Ambil Data`**, pilih sumber data di dropdown:
   - `Semua Pendaftar`,
   - `Pendaftar Kategori Olahraga`,
   - `Pendaftar Kategori Lomba`, atau
   - Pilih salah satu cabang lomba tertentu.
2. Klik tombol **`Ambil Data Pendaftar`** (atau klik **`Ambil Daftar Satker`** jika seluruh Satker Kemenag Tojo Una-Una diikutsertakan).
3. Seluruh nama tim otomatis terisi ke kotak ketikan manual di bawahnya. Admin tetap bebas **menambah, mengubah nama, atau menghapus baris tim** sebelum mesin undian diputar.

---

## Langkah 4 — Memilih Mode & Menekan Mesin Undian (Full Lomba atau Nomor Urut)
Pilih salah satu dari **3 Mode Pengundian** sesuai jenis lomba:

1. **Mode `Undian Pool / Grup` (Turnamen Full Lomba):**
   - Cocok untuk penyisihan grup olahraga beregu/ganda (Voli, Futsal, Bulu Tangkis, Takraw, dll.).
   - Pilih jumlah pembagian grup: **`2 Grup`**, **`3 Grup`**, **`4 Grup`**, **`6 Grup`**, atau **`8 Grup`** (*Grup A, Grup B, dst.*).
   - Klik tombol **`Putar Mesin Undian Full Lomba`**.

2. **Mode `Undian Sistem Gugur` (Full Matchup):**
   - Cocok untuk pertandingan langsung sistem gugur (*knockout*).
   - Sistem langsung memasangkan **Partai #1 (`Tim A vs Tim B`)**, **Partai #2**, dst.
   - Jika jumlah tim ganjil, sistem otomatis memberikan status **`BYE (Lolos Langsung Babak Berikutnya)`** pada tim di urutan terakhir hasil acakan.
   - Klik tombol **`Putar Mesin Undian Full Lomba`**.

3. **Mode `Undian Nomor Urut`:**
   - Cocok untuk lomba seni, keagamaan, atau keterampilan yang dinilai berdasarkan giliran tampil (MTQ, Paduan Suara, Qasidah, Pidato, Lomba Kuliner, dll.).
   - Sistem mengacak seluruh peserta menjadi urutan tampil **`Urut #01`**, **`Urut #02`**, **`Urut #03`**, dst.
   - Klik tombol **`Putar Mesin Undian Nomor Urut`**.

### Apa yang Terjadi Saat Tombol Diputar?
- Animasi pengocokan berjalan di layar selama **~2 detik** (menampilkan perputaran acak nama tim agar transparan saat direkam layar OBS maupun ditonton langsung).
- Jika di tengah putaran Admin melihat ada kesalahan (misal salah pilih mode atau tim belum lengkap), tekan tombol **`Batalkan Putaran`** sebelum ~2 detik selesai—mesin langsung berhenti dan hasil tidak disimpan ke database.
- Begitu selesai, hasil undian langsung masuk ke **Papan Hasil Undian Resmi (Real-Time)** dan tersimpan otomatis ke **Cloud Firestore** sehingga seluruh penonton di website melihat hasilnya secara bersamaan.

---

## Langkah 5 — Tindak Lanjut Setelah Undian Selesai
Pada **`Papan Hasil Undian Resmi (Real-Time)`** di bagian bawah:
1. **`Kirim ke Papan Skor Live`** *(khusus Mode Pool & Sistem Gugur, Admin Only)*:
   - Satu klik otomatis mengubah pasangan pertandingan (*Partai #1..N* atau *Penyisihan Grup*) menjadi daftar pertandingan pada tab **`Papan Skor`**, siap untuk diisi skor pertandingan selama Porseni berlangsung.
2. **`Berita Acara PDF`**:
   - Mengunduh dokumen resmi ber-Kop **Kantor Kementerian Agama Kabupaten Tojo Una-Una** berisi tabel lengkap hasil undian siap cetak/tanda tangan panitia.
3. **`Bagikan WA`**:
   - Membagikan ringkasan teks hasil undian beserta tautan langsung website ke grup WhatsApp Kontingen.
4. **`Batalkan & Ulangi`** *(Admin Only)*:
   - Digunakan jika undian sudah selesai namun ada kekeliruan teknis (misalnya salah jumlah pool, ada tim susulan, atau kesepakatan *Technical Meeting* untuk mengundi ulang).
   - Satu klik akan **menghapus permanen** hasil undian yang keliru (termasuk membersihkan otomatis jadwal pertandingan di tab **`Papan Skor`** apabila sebelumnya sudah dikirim), lalu **mengisi ulang otomatis** nama lomba, mode, catatan, dan seluruh daftar tim ke panel editor Admin agar tinggal koreksi dan putar ulang.
5. **`Hapus`** *(Admin Only)*:
   - Jika ada sesi uji coba atau salah entri yang tidak ingin diulang, Admin dapat menekan **`Hapus`**. Data terhapus secara **permanen** dari database Cloud Firestore, cache lokal, dan jadwal **`Papan Skor`** terkait (tidak akan muncul kembali).

---

## Ringkasan Troubleshooting Cepat
- **Link YouTube tidak muncul:** Pastikan link berasal dari YouTube resmi (`youtube.com/live/...`, `youtube.com/watch?v=...`, atau `youtu.be/...`) dan pengaturan *Embed* pada video/live di YouTube Studio diaktifkan (*Allow embedding*).
- **Tombol Putar terkunci:** Pastikan Anda sudah membuka **`Kontrol Admin (PIN)`** terlebih dahulu menggunakan PIN Panitia.
- **Jumlah tim terbaca lebih sedikit dari yang diketik:** Periksa apakah ada nama tim yang persis sama/ganda, karena sistem otomatis menghapus duplikat baris yang sama persis.
- **Ingin mengulang undian yang sudah tampil:** Tekan **`Batalkan & Ulangi`** di papan hasil; sistem otomatis menghapus hasil lama (beserta jadwal di *Papan Skor*) dan memuat ulang daftar tim ke editor.
