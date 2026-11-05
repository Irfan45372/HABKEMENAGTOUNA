# Galeri Spanduk, Banner Ucapan & Foto Kegiatan Satker HAB ke-81

Menghadirkan seksi khusus di halaman portal resmi **HAB ke-81 Kementerian Agama Kabupaten Tojo Una-Una** bagi seluruh Satker (KUA Daratan & Kepulauan, Madrasah, Pondok Pesantren, DWP, dan Induk) untuk mengunggah **Spanduk/Banner Ucapan Selamat** maupun **Foto Persiapan & Kegiatan**, lengkap dengan kendali penuh **Tambah, Edit, dan Hapus (Admin Only)** baik langsung di halaman maupun di dalam **Panel Admin (`AdminControlModal`)**.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Seluruh keputusan di bawah ini telah disesuaikan dengan jawaban klarifikasi Anda dan siap dieksekusi begitu Anda menekan tombol **Proceed**.

- **Akses Pengiriman & Moderasi**: Perwakilan Satker dapat langsung mengirimkan Spanduk/Banner atau Foto Kegiatan melalui formulir di halaman portal, sedangkan **Admin Panitia** memiliki kendali penuh untuk menambah, mengedit teks/gambar/kategori, atau menghapus item kapan saja (baik langsung dari kartu banner di halaman maupun melalui `AdminControlModal`).
- **Tata Letak Seksi Khusus**: Ditampilkan sebagai seksi mandiri dengan tab filter interaktif (**Semua**, **Spanduk & Banner Ucapan Satker**, **Foto Persiapan Kontingen**, dan **Dokumentasi Kegiatan/Baksos**) serta fitur **Lightbox Preview Layar Penuh** saat gambar diklik.
- **Metode Input Ganda & Ramah Hosting Gratis (GitHub Pages)**: Mendukung **Upload File Gambar Langsung** (otomatis dikompresi ke format WebP/JPEG ringan menggunakan HTML5 Canvas agar hemat memori JSON/LocalStorage) serta **Input Link URL Gambar** (Google Drive / link gambar langsung), disertai state `bannerUcapan` opsional pada setiap entri Satker.

---

## 1. Overview & Core Concept

- **What It Does**: Menyediakan etalase visual resmi untuk menampilkan spanduk digital ucapan HAB ke-81, baliho kontingen, serta foto-foto persiapan dan pelaksanaan kegiatan dari seluruh Satuan Kerja di lingkungan Kemenag Kab. Tojo Una-Una.
- **Target Audience / Persona**:
  - **Operator / Perwakilan Satker & Madrasah**: Mengunggah spanduk ucapan resmi Satker atau foto latihan/persiapan kontingen Porseni & Baksos.
  - **Panitia / Admin Portal HAB ke-81**: Mengunggah banner resmi setiap Satker melalui `AdminControlModal`, memperbarui teks `bannerUcapan`, mengganti gambar yang keliru, atau menghapus kiriman yang tidak sesuai.
  - **Masyarakat & Keluarga Besar Kemenag Touna**: Melihat kemeriahan spanduk dan dokumentasi persiapan seluruh Satker se-Kabupaten Tojo Una-Una.
- **Key Value**: Memisahkan dokumentasi foto/spanduk statis dari galeri video sehingga tampilan portal jauh lebih rapi, ringan diakses pada domain gratis GitHub Pages, dan setiap Satker memiliki ruang apresiasi visual yang terkelola oleh Admin.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Menjelajahi Spanduk & Foto Satker**: Pengunjung membuka bagian **Spanduk, Banner & Foto Kegiatan Satker**, memfilter berdasarkan tab kategori (*Spanduk & Banner Ucapan*, *Foto Persiapan*, *Dokumentasi Kegiatan*) atau mencari nama Satker, lalu mengklik gambar untuk melihat ukuran penuh di jendela *Lightbox*.
  2. **Kirim Spanduk / Foto oleh Satker**: Perwakilan Satker memilih nama Satker, memilih kategori, mengisi judul & teks `bannerUcapan` (opsional), lalu memilih antara **Upload File Gambar** (otomatis dikompresi) atau **Tempel Link Gambar**, dan menekan tombol kirim.
  3. **Kelola Banner Satker di `AdminControlModal` & Halaman Utama**:
     - Di halaman utama: Admin dapat menekan tombol **Edit** atau **Hapus** langsung pada kartu spanduk/foto (dilindungi verifikasi PIN Admin `812027`).
     - Di `AdminControlModal`: Admin memiliki panel manajemen khusus untuk mengunggah/memasukkan link gambar banner per Satker, mengatur teks `bannerUcapan` (opsional), serta mengedit atau menghapus daftar banner yang tampil di portal.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: *Institutional Emerald & Ceremonial Gold Gallery* yang selaras dengan identitas Kemenag RI dan ornamen 3D HAB ke-81.
  - *Color Palette & Mood*: Kanvas utama hijau zamrud gelap (`#021b15` dan `#03251c`), aksen emas seremonial (`#fbbf24` / `amber-400`) untuk tombol aksi utama dan tab aktif, serta teks putih bersih dan abu-abu terang (`slate-200`) dengan kontras tinggi.
  - *Typography & Hierarchy*: Heading menggunakan font display tegas dengan *tracking* rapat, sedangkan informasi Satker, tanggal unggah, dan keterangan disajikan sebagai teks bersih dengan pemisah tipografis (`·`) tanpa kotak *pill* berlebihan.
  - *Component Styling & Layout*: Kartu spanduk menggunakan rasio lanskap lebar (`16:9` atau `21:9` untuk spanduk/baliho) dan rasio dokumentasi (`4:3` untuk foto kegiatan), dilengkapi *fallback* visual elegan apabila link gambar eksternal gagal dimuat.
- **Interactive Feedback & Motion**: Indikator ukuran hasil kompresi gambar otomatis saat pengguna memilih file, konfirmasi instan saat banner berhasil disimpan/diedit/dihapus, serta modal *Lightbox* untuk memperbesar spanduk agar tulisan pada baliho Satker terbaca jelas.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Kompresi Gambar Otomatis di Sisi Klien (Client-Side Canvas Compression)**
  - *Chosen Approach*: Setiap file gambar spanduk/foto yang diunggah dari HP atau laptop otomatis di-*resize* (maksimal lebar `1200px`) dan dikompresi ke format JPEG/WebP (`quality: 0.78`) sehingga ukurannya hanya berkisar `60 KB – 150 KB` per spanduk.
  - *Why*: Menjaga agar penyimpanan `localStorage` dan file ekspor `hab81-kemenag-touna-2027-state.json` di GitHub Pages tetap cepat dimuat meskipun menampung puluhan spanduk Satker.
  - *Alternatives Considered*: Menyimpan file gambar mentah (RAW 5–10 MB dari kamera HP) ditolak karena akan langsung memenuhi batas memori browser (`5 MB`) hanya dalam 1–2 foto.
- **Decision 2: Dukungan Hibrida (Upload File + Link URL Gambar + State `bannerUcapan` Opsional)**
  - *Chosen Approach*: Menyediakan kedua opsi input (Upload File & Link URL Gambar) baik di form publik Satker maupun di `AdminControlModal`, dengan kolom `bannerUcapan` yang bersifat opsional.
  - *Why*: Memudahkan Admin atau Satker yang sudah memiliki file gambar di HP/komputer untuk langsung mengunggah, sekaligus memberi fleksibilitas bagi Admin yang ingin menempelkan link gambar resolusi tinggi dari Google Drive atau repositori GitHub.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌───────────────────────────────────────────────────────────────────────────┐
│                     AppState (localStorage + GitHub JSON)                 │
│  • satkerBanners: SatkerBannerItem[] (id, satker, kategori, judul,        │
│    imageUrl, bannerUcapan?, keterangan?, waktuUpload, disetujui)          │
└───────────────────┬───────────────────────────────────────┬───────────────┘
                    │                                       │
                    ▼                                       ▼
┌─────────────────────────────────────────┐ ┌───────────────────────────────┐
│   Seksi Galeri Spanduk & Foto Satker    │ │       AdminControlModal       │
│  • Tab Filter: Semua | Spanduk Ucapan   │ │  • Form Admin: Pilih Satker,  │
│    | Foto Persiapan | Dokumentasi       │ │    Upload Gambar / Link URL,  │
│  • Form Kirim Satker (Upload Kompresi   │ │    Input bannerUcapan         │
│    Otomatis + Input Link URL Gambar)    │ │  • Daftar Banner Satker:      │
│  • Lightbox Zoom & Download Spanduk     │ │    Inline Edit (Judul, Satker,│
│  • Tombol Edit & Hapus (PIN Admin Gate) │ │    Gambar, bannerUcapan) &    │
└─────────────────────────────────────────┘ │    Tombol Hapus               │
                                            └───────────────────────────────┘
```

- **Data Model & State**:
  - Entitas `SatkerBannerItem` di dalam `AppState` (`satkerBanners?: SatkerBannerItem[]`):
    - `id`: Identitas unik item banner/foto.
    - `satker`: Nama Satuan Kerja (terhubung dengan daftar master `satkerList` atau input Satker baru).
    - `kategori`: `'Spanduk & Banner Ucapan'` | `'Foto Persiapan Lomba'` | `'Dokumentasi Kegiatan & Baksos'`.
    - `judul`: Judul spanduk atau nama kegiatan dokumentasi.
    - `imageUrl`: DataURL gambar terkompresi atau Link URL gambar eksternal (otomatis mengonversi link berbagi Google Drive menjadi direct image link).
    - `bannerUcapan?: string`: Slogan atau ucapan selamat opsional dari Satker yang tampil menyertai banner.
    - `keterangan?: string`: Catatan tambahan kegiatan (opsional).
    - `waktuUpload`: Tanggal unggah.
- **Interactive Component & State Mapping**:
  - **Utilitas Kompresi & Normalisasi Link**: Mengonversi file gambar (`<input type="file" accept="image/*" />`) melalui `<canvas>` menjadi DataURL ringan, serta menormalisasi URL Google Drive (`drive.google.com/file/d/...`) agar dapat dirender langsung oleh tag `<img>`.
  - **Seksi Publik + Inline Admin Action**: Memungkinkan filter per kategori dan pencarian Satker, membuka modal pratinjau ukuran penuh (*Lightbox*), serta menyediakan tombol **Edit** dan **Hapus** khusus Admin langsung di setiap kartu.
  - **Manajemen Penuh di `AdminControlModal` (Tab 4)**: Menambahkan sub-panel manajemen **Spanduk, Banner & Foto Kegiatan Satker** di mana Admin dapat memilih Satker dari dropdown, mengunggah file atau menempelkan link gambar banner, mengisi `bannerUcapan` (opsional), serta mengedit atau menghapus setiap item yang tampil di portal.
  - **Sinkronisasi Ekspor/Impor JSON GitHub**: Memastikan validasi state (`validateImportedState`) menyertakan `satkerBanners` sehingga seluruh perubahan Admin tersimpan saat diekspor ke `hab81-kemenag-touna-2027-state.json`.
