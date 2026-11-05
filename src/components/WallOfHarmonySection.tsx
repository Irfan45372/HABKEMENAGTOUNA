import React, { useMemo, useState } from 'react';
import { HarmonyMessage } from '../types/hab';
import { CheckCircle2, MessageSquareHeart, Send } from 'lucide-react';

interface WallOfHarmonySectionProps {
  messages: HarmonyMessage[];
  satkerList: string[];
  onAddMessage: (msg: HarmonyMessage) => void;
}

export const WallOfHarmonySection: React.FC<WallOfHarmonySectionProps> = ({
  messages,
  satkerList,
  onAddMessage,
}) => {
  const [nama, setNama] = useState<string>('');
  const [jabatanAtauSatker, setJabatanAtauSatker] = useState<string>(
    satkerList[0] || 'Kantor Kemenag Kab. Tojo Una-Una'
  );
  const [kategori, setKategori] = useState<HarmonyMessage['kategori']>(
    'Ucapan Selamat HAB ke-81'
  );
  const [pesan, setPesan] = useState<string>('');
  const [filterKat, setFilterKat] = useState<string>('Semua');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const approvedMessages = useMemo(() => {
    const approved = messages.filter((m) => m.disetujui);
    if (filterKat === 'Semua') return approved;
    return approved.filter((m) => m.kategori === filterKat);
  }, [messages, filterKat]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!nama || nama.trim().length < 2) {
      setErrorMsg('Mohon isi Nama Pengirim terlebih dahulu.');
      return;
    }
    if (!pesan || pesan.trim().length < 8) {
      setErrorMsg('Pesan ucapan atau saran minimal 8 karakter.');
      return;
    }

    const newMsg: HarmonyMessage = {
      id: `msg-${Date.now()}`,
      nama: nama.trim(),
      jabatanAtauSatker: jabatanAtauSatker.trim() || 'Masyarakat Tojo Una-Una',
      kategori,
      pesan: pesan.trim(),
      waktu: new Date().toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      disetujui: true,
    };

    onAddMessage(newMsg);
    setNama('');
    setPesan('');
    setSuccessMsg(
      'Terima kasih! Ucapan / Aspirasi Anda telah tampil di Dinding Kerukunan (Wall of Harmony).'
    );
  };

  return (
    <section
      id="aspirasi-ucapan"
      aria-label="Kotak Saran, Aspirasi dan Wall of Harmony"
      className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-emerald-900/70"
    >
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-semibold text-amber-300 tracking-wide mb-1">
            05. Suara Umat & Keluarga Besar Kementerian Agama
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white [text-wrap:balance]">
            Kotak Saran, Aspirasi & Dinding Ucapan Selamat (Wall of Harmony)
          </h2>
          <p className="text-sm text-slate-300 mt-1.5 max-w-2xl">
            Sampaikan doa, ucapan selamat Hari Amal Bakti ke-81, maupun masukan konstruktif untuk kesuksesan seluruh rangkaian acara di Kabupaten Tojo Una-Una.
          </p>
        </div>

        {/* Category Filter Buttons */}
        <div
          role="tablist"
          aria-label="Filter Kategori Ucapan"
          className="flex flex-wrap items-center gap-1.5 bg-[#03221a] p-1.5 rounded-xl border border-emerald-800/80"
        >
          {[
            'Semua',
            'Ucapan Selamat HAB ke-81',
            'Doa Kerukunan Umat',
            'Aspirasi & Saran Panitia',
          ].map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={filterKat === k}
              type="button"
              onClick={() => setFilterKat(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                filterKat === k
                  ? 'bg-amber-400 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 5 Cols: Submission Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-5 bg-[#03251c] border border-emerald-800/80 rounded-2xl p-6 space-y-4"
        >
          <div className="border-b border-emerald-800/70 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <MessageSquareHeart className="w-4 h-4 text-amber-400" />
              Kirim Ucapan Selamat / Aspirasi
            </h3>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-rose-950/90 border border-rose-500/60 text-xs text-rose-200"
            >
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div
              role="status"
              className="p-3 rounded-lg bg-emerald-900/90 border border-emerald-400/60 text-xs text-emerald-100 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="harmony-name"
              className="block text-xs font-semibold text-slate-200 mb-1"
            >
              Nama Pengirim / Keluarga Besar *
            </label>
            <input
              id="harmony-name"
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Contoh: Keluarga Besar KUA Kec. Ulubongka"
              className="w-full px-3.5 py-2 rounded-lg bg-[#021b15] border border-emerald-700/80 text-sm text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label
              htmlFor="harmony-satker"
              className="block text-xs font-semibold text-slate-200 mb-1"
            >
              Jabatan / Satuan Kerja / Instansi
            </label>
            <input
              id="harmony-satker"
              type="text"
              list="harmony-satker-options"
              value={jabatanAtauSatker}
              onChange={(e) => setJabatanAtauSatker(e.target.value)}
              placeholder="Ketik atau pilih Satker..."
              className="w-full px-3.5 py-2 rounded-lg bg-[#021b15] border border-emerald-700/80 text-sm text-white focus:outline-none focus:border-amber-400"
            />
            <datalist id="harmony-satker-options">
              {satkerList.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>

          <div>
            <label
              htmlFor="harmony-category"
              className="block text-xs font-semibold text-slate-200 mb-1"
            >
              Kategori Pesan *
            </label>
            <select
              id="harmony-category"
              value={kategori}
              onChange={(e) =>
                setKategori(e.target.value as HarmonyMessage['kategori'])
              }
              className="w-full px-3.5 py-2 rounded-lg bg-[#021b15] border border-emerald-700/80 text-sm text-white focus:outline-none focus:border-amber-400"
            >
              <option value="Ucapan Selamat HAB ke-81">Ucapan Selamat HAB ke-81</option>
              <option value="Doa Kerukunan Umat">Doa Kerukunan Umat</option>
              <option value="Aspirasi & Saran Panitia">Aspirasi & Saran Panitia</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="harmony-message"
              className="block text-xs font-semibold text-slate-200 mb-1"
            >
              Isi Ucapan / Doa / Aspirasi *
            </label>
            <textarea
              id="harmony-message"
              rows={4}
              value={pesan}
              onChange={(e) => setPesan(e.target.value)}
              placeholder="Tuliskan doa, harapan, atau saran untuk peringatan HAB ke-81 Kemenag Kab. Tojo Una-Una..."
              className="w-full px-3.5 py-2 rounded-lg bg-[#021b15] border border-emerald-700/80 text-sm text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
          >
            <Send className="w-4 h-4" />
            <span>Kirim ke Dinding Kerukunan</span>
          </button>
        </form>

        {/* Right 7 Cols: Live Wall of Harmony */}
        <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4">
          {approvedMessages.map((msg) => (
            <article
              key={msg.id}
              className="bg-[#03251c] border border-emerald-800/80 rounded-2xl p-5 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-amber-300 font-semibold">{msg.kategori}</span>
                  <span className="text-slate-400 font-mono-tabular">{msg.waktu}</span>
                </div>
                <p className="text-sm text-slate-100 leading-relaxed">“{msg.pesan}”</p>
              </div>

              <div className="pt-3 border-t border-emerald-800/60">
                <div className="text-xs font-bold text-white">{msg.nama}</div>
                <div className="text-[11px] text-emerald-300">{msg.jabatanAtauSatker}</div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
