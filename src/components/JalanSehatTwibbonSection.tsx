import React, { useEffect, useRef, useState } from 'react';
import { BrandingConfig, JalanSehatCoupon } from '../types/hab';
import {
  generateJalanSehatTicketNumber,
  generateQrMatrix,
  pickLuckyDrawWinner,
} from '../utils/habLogic';
import {
  drawFallbackKemenagCrestOnCanvas,
  drawProceduralHab81OnCanvas,
  loadAnonymousImage,
} from './DynamicLogoBadge';
import {
  Camera,
  CheckCircle2,
  Download,
  Gift,
  QrCode,
  RefreshCw,
  Sparkles,
  Ticket,
  Trophy,
  Upload,
} from 'lucide-react';

interface JalanSehatTwibbonSectionProps {
  branding: BrandingConfig;
  satkerList: string[];
  coupons: JalanSehatCoupon[];
  onAddCoupon: (coupon: JalanSehatCoupon) => void;
  onMarkCouponWinner: (couponId: string, prizeName: string) => void;
}

export const JalanSehatTwibbonSection: React.FC<JalanSehatTwibbonSectionProps> = ({
  branding,
  satkerList,
  coupons,
  onAddCoupon,
  onMarkCouponWinner,
}) => {
  const [activeMode, setActiveMode] = useState<'kupon' | 'twibbon'>('kupon');

  // Coupon Registration Form State
  const [namaPeserta, setNamaPeserta] = useState<string>('');
  const [satkerAtauUmum, setSatkerAtauUmum] = useState<string>(satkerList[0] || 'Masyarakat Umum');
  const [nikAtauNip, setNikAtauNip] = useState<string>('');
  const [noHp, setNoHp] = useState<string>('');
  const [couponError, setCouponError] = useState<string | null>(null);

  // Currently previewed coupon on the Digital Ticket Canvas
  const [activeCoupon, setActiveCoupon] = useState<JalanSehatCoupon>(
    () =>
      coupons[0] || {
        id: 'cpn-preview',
        nomorKupon: 'HAB81-TOUNA-0001-81',
        namaPeserta: 'H. Muh. Syahrir, S.Ag., M.H.',
        satkerAtauUmum: 'Kantor Kemenag Kab. Tojo Una-Una (Induk)',
        nikAtauNip: '197503112000031002',
        noHp: '081241008181',
        waktuRegistrasi: '10 Nov 2026, 08:15 WITA',
      }
  );

  const ticketCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Lucky Draw Spinner Modal State
  const [luckyModalOpen, setLuckyModalOpen] = useState<boolean>(false);
  const [prizeInput, setPrizeInput] = useState<string>(
    'Hadiah Utama Sepeda Listrik Kerukunan HAB-81'
  );
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [rollingTicketDisplay, setRollingTicketDisplay] = useState<string>('HAB81-TOUNA-XXXX-XX');
  const [rollingNameDisplay, setRollingNameDisplay] = useState<string>(
    'Siap Mengundi Kupon Peserta...'
  );
  const [drawnWinner, setDrawnWinner] = useState<JalanSehatCoupon | null>(null);

  // Twibbon Studio State
  const [twibbonName, setTwibbonName] = useState<string>('Keluarga Besar ASN Kemenag Touna');
  const [twibbonSatker, setTwibbonSatker] = useState<string>(
    'Kantor Kementerian Agama Kab. Tojo Una-Una'
  );
  const [twibbonPhotoUrl, setTwibbonPhotoUrl] = useState<string>('');
  const twibbonCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Render High-Res Digital Ticket Card on HTML5 Canvas whenever activeCoupon or branding changes
  useEffect(() => {
    let cancelled = false;
    const renderTicketCanvas = async () => {
      const canvas = ticketCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const [kemenagImg, habImg] = await Promise.all([
        loadAnonymousImage(branding.kemenagLogoPrimaryUrl, branding.kemenagLogoFallbackUrl),
        branding.habLogoCustomUrl
          ? loadAnonymousImage(branding.habLogoCustomUrl)
          : Promise.resolve(null),
      ]);
      if (cancelled) return;

      const W = 880;
      const H = 420;
      canvas.width = W;
      canvas.height = H;

      // Deep Emerald & Gold Ticket Background
      const bgGrad = ctx.createLinearGradient(0, 0, W, H);
      bgGrad.addColorStop(0, '#022c22');
      bgGrad.addColorStop(0.55, '#064e3b');
      bgGrad.addColorStop(1, '#021b15');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Decorative Gold Frame Border
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 4;
      ctx.strokeRect(14, 14, W - 28, H - 28);

      ctx.strokeStyle = 'rgba(251, 191, 36, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(22, 22, W - 44, H - 44);

      // Perforated Stub Divider Line at X = 600
      ctx.save();
      ctx.setLineDash([8, 8]);
      ctx.strokeStyle = 'rgba(253, 230, 138, 0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(600, 18);
      ctx.lineTo(600, H - 18);
      ctx.stroke();
      ctx.restore();

      // Top Left Logos: Official Kemenag + Dynamic HAB 81
      if (kemenagImg) {
        ctx.drawImage(kemenagImg, 42, 38, 68, 68);
      } else {
        drawFallbackKemenagCrestOnCanvas(ctx, 76, 72, 34);
      }

      if (habImg) {
        ctx.drawImage(habImg, 122, 38, 68, 68);
      } else {
        drawProceduralHab81OnCanvas(ctx, 156, 72, 34);
      }

      // Header Text
      ctx.fillStyle = '#fde047';
      ctx.font = '700 15px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('KUPON RESMI JALAN SEHAT KERUKUNAN & DOORPRIZE', 208, 56);

      ctx.fillStyle = '#ffffff';
      ctx.font = '800 22px "Cinzel", Georgia, serif';
      ctx.fillText('HARI AMAL BAKTI KE-81 KEMENAG RI', 208, 84);

      ctx.fillStyle = '#a7f3d0';
      ctx.font = '600 14px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Kantor Kementerian Agama Kabupaten Tojo Una-Una Tahun 2027', 208, 106);

      // Ticket Number Box
      ctx.fillStyle = 'rgba(2, 27, 21, 0.85)';
      ctx.fillRect(42, 128, 530, 56);
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 2;
      ctx.strokeRect(42, 128, 530, 56);

      ctx.fillStyle = '#fde68a';
      ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('NOMOR UNDIAN DIGITAL:', 58, 150);

      ctx.fillStyle = '#fbbf24';
      ctx.font = '700 24px "JetBrains Mono", monospace';
      ctx.fillText(activeCoupon.nomorKupon, 230, 165);

      // Participant Info Rows
      const drawRow = (label: string, val: string, y: number) => {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(label, 42, y);
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 16px "Plus Jakarta Sans", sans-serif';
        const truncated = val.length > 38 ? val.slice(0, 38) + '…' : val;
        ctx.fillText(truncated, 195, y);
      };

      drawRow('Nama Peserta', activeCoupon.namaPeserta, 222);
      drawRow('Satker / Utusan', activeCoupon.satkerAtauUmum, 256);
      drawRow('NIP / NIK', activeCoupon.nikAtauNip || '-', 290);
      drawRow('Waktu Registrasi', activeCoupon.waktuRegistrasi, 324);

      // Footer Note
      ctx.fillStyle = '#fde68a';
      ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(
        'Lokasi: Lapangan Taman JH Ampana • Simpan kupon ini untuk verifikasi pemenang undian.',
        42,
        378
      );

      // Right Stub: Deterministic 21x21 QR Code Matrix
      const qrMatrix = generateQrMatrix(
        `${activeCoupon.nomorKupon}|${activeCoupon.namaPeserta}|HAB81TOUNA`
      );
      const qrBoxSize = 189; // 21 * 9
      const qrX = 645;
      const qrY = 76;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(qrX - 12, qrY - 12, qrBoxSize + 24, qrBoxSize + 24);
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 3;
      ctx.strokeRect(qrX - 12, qrY - 12, qrBoxSize + 24, qrBoxSize + 24);

      const cell = 9;
      ctx.fillStyle = '#022c22';
      for (let r = 0; r < qrMatrix.length; r++) {
        for (let c = 0; c < qrMatrix[r].length; c++) {
          if (qrMatrix[r][c] === 1) {
            ctx.fillRect(qrX + c * cell, qrY + r * cell, cell, cell);
          }
        }
      }

      ctx.fillStyle = '#fde047';
      ctx.font = '700 13px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(activeCoupon.nomorKupon, qrX + qrBoxSize / 2, qrY + qrBoxSize + 36);

      ctx.fillStyle = '#a7f3d0';
      ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('SCAN VERIFIKASI PANITIA', qrX + qrBoxSize / 2, qrY + qrBoxSize + 56);
      ctx.textAlign = 'left';
    };

    renderTicketCanvas();
    return () => {
      cancelled = true;
    };
  }, [activeCoupon, branding]);

  // Render Twibbon Frame Canvas whenever Twibbon state or branding changes
  useEffect(() => {
    let cancelled = false;
    const renderTwibbon = async () => {
      const canvas = twibbonCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const [kemenagImg, habImg, userPhoto] = await Promise.all([
        loadAnonymousImage(branding.kemenagLogoPrimaryUrl, branding.kemenagLogoFallbackUrl),
        branding.habLogoCustomUrl
          ? loadAnonymousImage(branding.habLogoCustomUrl)
          : Promise.resolve(null),
        twibbonPhotoUrl ? loadAnonymousImage(twibbonPhotoUrl) : Promise.resolve(null),
      ]);
      if (cancelled) return;

      const S = 640;
      canvas.width = S;
      canvas.height = S;

      // Background Emerald Royal Gradient
      const bg = ctx.createRadialGradient(S / 2, S / 2, 40, S / 2, S / 2, S * 0.72);
      bg.addColorStop(0, '#047857');
      bg.addColorStop(0.6, '#064e3b');
      bg.addColorStop(1, '#021b15');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, S, S);

      // Center Circular Portrait Frame
      const cx = S / 2;
      const cy = 285;
      const radius = 158;

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      if (userPhoto) {
        // Cover-fit user photo inside circle
        const scale = Math.max(
          (radius * 2) / userPhoto.width,
          (radius * 2) / userPhoto.height
        );
        const dw = userPhoto.width * scale;
        const dh = userPhoto.height * scale;
        ctx.drawImage(userPhoto, cx - dw / 2, cy - dh / 2, dw, dh);
      } else {
        // Festive Kemenag Silhouette Avatar
        const pGrad = ctx.createLinearGradient(cx, cy - radius, cx, cy + radius);
        pGrad.addColorStop(0, '#065f46');
        pGrad.addColorStop(1, '#022c22');
        ctx.fillStyle = pGrad;
        ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

        ctx.fillStyle = 'rgba(251, 191, 36, 0.25)';
        ctx.beginPath();
        ctx.arc(cx, cy - 28, 46, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, cy + 115, 92, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Gold Ring Frame around Portrait
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 6, 0, Math.PI * 2);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 8;
      ctx.stroke();

      // Top Logos Header
      if (kemenagImg) {
        ctx.drawImage(kemenagImg, 36, 28, 64, 64);
      } else {
        drawFallbackKemenagCrestOnCanvas(ctx, 68, 60, 32);
      }
      if (habImg) {
        ctx.drawImage(habImg, S - 100, 28, 64, 64);
      } else {
        drawProceduralHab81OnCanvas(ctx, S - 68, 60, 32);
      }

      ctx.textAlign = 'center';
      ctx.fillStyle = '#fef08a';
      ctx.font = '700 15px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('SELAMAT & SUKSES PERINGATAN', cx, 50);

      ctx.fillStyle = '#ffffff';
      ctx.font = '800 22px "Cinzel", Georgia, serif';
      ctx.fillText('HARI AMAL BAKTI KE-81 KEMENAG RI', cx, 78);

      ctx.fillStyle = '#a7f3d0';
      ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('KANTOR KEMENTERIAN AGAMA KAB. TOJO UNA-UNA 2027', cx, 100);

      // Bottom Name & Satker Ribbon Banner
      ctx.fillStyle = 'rgba(2, 27, 21, 0.92)';
      ctx.fillRect(46, 474, S - 92, 92);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(46, 474, S - 92, 92);

      ctx.fillStyle = '#fbbf24';
      ctx.font = '800 22px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(twibbonName || 'Keluarga Besar Kemenag Touna', cx, 512);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '600 15px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(twibbonSatker || 'Kabupaten Tojo Una-Una', cx, 542);

      ctx.fillStyle = '#fde68a';
      ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
      const shortTagline =
        branding.officialTagline.length > 68
          ? branding.officialTagline.slice(0, 68) + '…'
          : branding.officialTagline;
      ctx.fillText(`“${shortTagline}”`, cx, 602);
    };

    renderTwibbon();
    return () => {
      cancelled = true;
    };
  }, [twibbonName, twibbonSatker, twibbonPhotoUrl, branding]);

  const handleGenerateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError(null);

    if (!namaPeserta || namaPeserta.trim().length < 2) {
      setCouponError('Silakan isi Nama Lengkap Peserta Jalan Sehat.');
      return;
    }
    if (!nikAtauNip || nikAtauNip.trim().length < 4) {
      setCouponError('Masukkan minimal 4 digit terakhir NIP / NIK untuk kode unik kupon.');
      return;
    }

    const nextSeq = coupons.length + 1;
    const ticketNum = generateJalanSehatTicketNumber(nextSeq, nikAtauNip);
    const newCoupon: JalanSehatCoupon = {
      id: `cpn-${Date.now()}`,
      nomorKupon: ticketNum,
      namaPeserta: namaPeserta.trim(),
      satkerAtauUmum: satkerAtauUmum.trim(),
      nikAtauNip: nikAtauNip.trim(),
      noHp: noHp.trim() || '-',
      waktuRegistrasi: new Date().toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      sudahMenang: false,
    };

    onAddCoupon(newCoupon);
    setActiveCoupon(newCoupon);
    setNamaPeserta('');
    setNikAtauNip('');
    setNoHp('');
  };

  const handleDownloadTicketPng = () => {
    const canvas = ticketCanvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `Kupon-JalanSehat-${activeCoupon.nomorKupon}.png`;
    a.click();
  };

  const handleDownloadTwibbonPng = () => {
    const canvas = twibbonCanvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `Twibbon-HAB81-KemenagTouna.png`;
    a.click();
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setTwibbonPhotoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Lucky Draw Spinner Handler
  const handleStartSpin = () => {
    const eligible = coupons.filter((c) => !c.sudahMenang);
    if (eligible.length === 0 || isSpinning) return;

    setIsSpinning(true);
    setDrawnWinner(null);

    let ticks = 0;
    const maxTicks = 24;
    const interval = window.setInterval(() => {
      const sample = eligible[ticks % eligible.length];
      setRollingTicketDisplay(sample.nomorKupon);
      setRollingNameDisplay(`${sample.namaPeserta} (${sample.satkerAtauUmum})`);
      ticks++;

      if (ticks >= maxTicks) {
        window.clearInterval(interval);
        const winner = pickLuckyDrawWinner(coupons);
        if (winner) {
          setRollingTicketDisplay(winner.nomorKupon);
          setRollingNameDisplay(`${winner.namaPeserta} — ${winner.satkerAtauUmum}`);
          setDrawnWinner(winner);
          onMarkCouponWinner(winner.id, prizeInput);
        }
        setIsSpinning(false);
      }
    }, 65);
  };

  const eligibleCount = coupons.filter((c) => !c.sudahMenang).length;
  const winnersList = coupons.filter((c) => c.sudahMenang);

  return (
    <section
      id="jalan-sehat"
      aria-label="Jalan Sehat Kerukunan, Generator Kupon QR Digital & Twibbon Studio"
      className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-emerald-900/70 space-y-8"
    >
      {/* Header & Mode Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-amber-300 tracking-wide mb-1">
            04. Semarak Kebersamaan Umat & Masyarakat Tojo Una-Una
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white [text-wrap:balance]">
            Jalan Sehat Kerukunan, Kupon QR Digital & Twibbon HAB ke-81
          </h2>
          <p className="text-sm text-slate-300 mt-1.5 max-w-2xl">
            Dapatkan Kupon QR Digital resmi dengan Nomor Tiket unik untuk pengundian Doorprize Panggung Utama, atau buat Bingkai Twibbon ucapan selamat HAB ke-81.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="tablist"
            className="flex items-center gap-1.5 bg-[#03221a] p-1.5 rounded-xl border border-emerald-800/80"
          >
            <button
              role="tab"
              aria-selected={activeMode === 'kupon'}
              type="button"
              onClick={() => setActiveMode('kupon')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeMode === 'kupon'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>Generator Kupon QR Digital</span>
            </button>
            <button
              role="tab"
              aria-selected={activeMode === 'twibbon'}
              type="button"
              onClick={() => setActiveMode('twibbon')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeMode === 'twibbon'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Studio Twibbon HAB ke-81</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setLuckyModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-amber-200 border border-amber-400/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-md"
          >
            <Gift className="w-4 h-4 text-amber-300" />
            <span>Mesin Undian Doorprize ({coupons.length} Kupon)</span>
          </button>
        </div>
      </div>

      {/* MODE 1: JALAN SEHAT QR COUPON GENERATOR */}
      {activeMode === 'kupon' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left 5 Cols: Quick Registration Form */}
          <form
            onSubmit={handleGenerateCoupon}
            className="lg:col-span-5 bg-[#03251c] border border-emerald-800/80 rounded-2xl p-6 space-y-4"
          >
            <div className="border-b border-emerald-800/70 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <QrCode className="w-4 h-4 text-amber-400" />
                Registrasi Cepat Kupon Jalan Sehat
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Isi data diri untuk menerbitkan kartu kupon digital ber-QR Code
              </p>
            </div>

            {couponError && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-rose-950/90 border border-rose-500/50 text-xs text-rose-200"
              >
                {couponError}
              </div>
            )}

            <div>
              <label
                htmlFor="cpn-name"
                className="block text-xs font-semibold text-slate-200 mb-1"
              >
                Nama Lengkap Peserta *
              </label>
              <input
                id="cpn-name"
                type="text"
                value={namaPeserta}
                onChange={(e) => setNamaPeserta(e.target.value)}
                placeholder="Contoh: Drs. H. Muh. Syahrir, M.H."
                className="w-full px-3.5 py-2 rounded-lg bg-[#021b15] border border-emerald-700/80 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label
                htmlFor="cpn-satker"
                className="block text-xs font-semibold text-slate-200 mb-1"
              >
                Satker / KUA / Madrasah / Masyarakat Umum *
              </label>
              <select
                id="cpn-satker"
                value={satkerAtauUmum}
                onChange={(e) => setSatkerAtauUmum(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-[#021b15] border border-emerald-700/80 text-sm text-white focus:outline-none focus:border-amber-400"
              >
                {satkerList.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="cpn-nik"
                  className="block text-xs font-semibold text-slate-200 mb-1"
                >
                  NIP / NIK (Min. 4 Digit) *
                </label>
                <input
                  id="cpn-nik"
                  type="text"
                  value={nikAtauNip}
                  onChange={(e) => setNikAtauNip(e.target.value)}
                  placeholder="19850101..."
                  className="w-full px-3.5 py-2 rounded-lg bg-[#021b15] border border-emerald-700/80 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label
                  htmlFor="cpn-hp"
                  className="block text-xs font-semibold text-slate-200 mb-1"
                >
                  Nomor HP / WhatsApp
                </label>
                <input
                  id="cpn-hp"
                  type="tel"
                  value={noHp}
                  onChange={(e) => setNoHp(e.target.value)}
                  placeholder="0812..."
                  className="w-full px-3.5 py-2 rounded-lg bg-[#021b15] border border-emerald-700/80 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm transition-colors cursor-pointer shadow-md"
            >
              Terbitkan Kupon QR Digital Sekarang
            </button>

            {/* Recent Coupons Switcher */}
            <div className="pt-3 border-t border-emerald-800/70">
              <div className="text-xs font-semibold text-emerald-300 mb-2">
                Kupon Terbit Terbaru (Klik untuk Pratinjau):
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {coupons.slice(0, 8).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveCoupon(c)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      activeCoupon.id === c.id
                        ? 'bg-emerald-800/80 text-white border border-amber-400/50'
                        : 'bg-[#021b15] text-slate-300 hover:text-white'
                    }`}
                  >
                    <span className="truncate font-medium">{c.namaPeserta}</span>
                    <span className="font-mono-tabular text-amber-300 shrink-0 ml-2">
                      {c.nomorKupon}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </form>

          {/* Right 7 Cols: Live Digital Ticket Canvas & Download */}
          <div className="lg:col-span-7 bg-[#03251c] border border-emerald-800/80 rounded-2xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-800/70 pb-3">
              <div>
                <div className="text-xs text-amber-300 font-semibold">
                  Pratinjau Kartu Tiket Digital Resmi
                </div>
                <h3
                  data-testid="active-coupon-number"
                  className="font-mono-tabular text-lg font-bold text-white"
                >
                  {activeCoupon.nomorKupon} — {activeCoupon.namaPeserta}
                </h3>
              </div>

              <button
                type="button"
                onClick={handleDownloadTicketPng}
                className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-sm"
              >
                <Download className="w-4 h-4" />
                Unduh Kupon PNG
              </button>
            </div>

            <div className="w-full overflow-hidden rounded-xl border border-amber-400/40 bg-[#021b15] p-2">
              <canvas
                ref={ticketCanvasRef}
                data-testid="digital-ticket-canvas"
                className="w-full h-auto block rounded-lg"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
              <span className="flex items-center gap-1.5 text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
                Kupon dilengkapi Logo Resmi Kemenag, Logo Dinamis HAB ke-81 & Kode QR Validasi
              </span>
              <span className="font-mono-tabular">
                Total Peserta Terdaftar: {coupons.length} Kupon
              </span>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: TWIBBON STUDIO HAB KE-81 */}
      {activeMode === 'twibbon' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 bg-[#03251c] border border-emerald-800/80 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white border-b border-emerald-800/70 pb-3">
              Kustomisasi Bingkai Twibbon HAB ke-81
            </h3>

            <div>
              <label
                htmlFor="twibbon-photo-upload"
                className="block text-xs font-semibold text-slate-200 mb-1.5"
              >
                Unggah Foto Profil / Potret Anda
              </label>
              <label
                htmlFor="twibbon-photo-upload"
                className="w-full py-3 px-4 rounded-xl border border-dashed border-amber-400/60 bg-[#021b15] hover:bg-emerald-950 text-xs text-amber-200 font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Pilih File Foto (JPG/PNG)</span>
              </label>
              <input
                id="twibbon-photo-upload"
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>

            <div>
              <label
                htmlFor="twibbon-name-input"
                className="block text-xs font-semibold text-slate-200 mb-1"
              >
                Nama Lengkap & Gelar pada Twibbon
              </label>
              <input
                id="twibbon-name-input"
                type="text"
                value={twibbonName}
                onChange={(e) => setTwibbonName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-[#021b15] border border-emerald-700 text-sm text-white"
              />
            </div>

            <div>
              <label
                htmlFor="twibbon-satker-input"
                className="block text-xs font-semibold text-slate-200 mb-1"
              >
                Jabatan / Satuan Kerja (Satker)
              </label>
              <input
                id="twibbon-satker-input"
                type="text"
                value={twibbonSatker}
                onChange={(e) => setTwibbonSatker(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-[#021b15] border border-emerald-700 text-sm text-white"
              />
            </div>

            <button
              type="button"
              onClick={handleDownloadTwibbonPng}
              className="w-full py-2.5 px-4 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Unduh Gambar Twibbon HAB ke-81 (PNG)
            </button>
          </div>

          <div className="lg:col-span-7 bg-[#03251c] border border-emerald-800/80 rounded-2xl p-6 flex flex-col items-center">
            <canvas
              ref={twibbonCanvasRef}
              className="w-full max-w-[420px] aspect-square rounded-xl border border-amber-400/40 shadow-xl"
            />
          </div>
        </div>
      )}

      {/* INTERACTIVE 3D / ANIMATED LUCKY DRAW SPINNER MODAL */}
      {luckyModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="lucky-draw-title"
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
        >
          <div className="bg-[#03251c] border-2 border-amber-400 rounded-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-emerald-800 pb-4">
              <div>
                <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  PANGGUNG UTAMA JALAN SEHAT KERUKUNAN HAB KE-81
                </div>
                <h3 id="lucky-draw-title" className="font-display text-2xl font-bold text-white mt-0.5">
                  Mesin Undian Kupon QR Digital (Lucky Draw)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLuckyModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-[#021b15] text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Tutup Modal
              </button>
            </div>

            {/* Prize Selection Input */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div className="sm:col-span-2">
                <label
                  htmlFor="lucky-prize-input"
                  className="block text-xs font-semibold text-emerald-200 mb-1"
                >
                  Hadiah Doorprize yang Sedang Diundi:
                </label>
                <input
                  id="lucky-prize-input"
                  type="text"
                  value={prizeInput}
                  onChange={(e) => setPrizeInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-[#021b15] border border-emerald-700 text-sm text-white font-semibold"
                />
              </div>
              <div className="text-xs text-slate-300 font-mono-tabular pb-2">
                Kupon Eligible: <strong className="text-amber-300">{eligibleCount}</strong> /{' '}
                {coupons.length}
              </div>
            </div>

            {/* 3D Drum / Slot Display Box */}
            <div className="bg-[#021b15] border-2 border-amber-400/70 rounded-2xl p-6 text-center space-y-2 shadow-inner">
              <div className="text-xs text-emerald-300 font-semibold tracking-wider">
                NOMOR KUPON TERPILIH
              </div>
              <div
                data-testid="lucky-draw-code"
                className="font-mono-tabular text-3xl sm:text-4xl font-extrabold text-amber-300 tracking-wider py-2"
              >
                {rollingTicketDisplay}
              </div>
              <div className="text-base sm:text-lg font-bold text-white">
                {rollingNameDisplay}
              </div>
              {drawnWinner && (
                <div className="pt-2 text-xs font-semibold text-emerald-300 flex items-center justify-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  Selamat! Memenangkan: {prizeInput}
                </div>
              )}
            </div>

            {/* Spin Trigger Button */}
            <div className="flex items-center justify-center">
              <button
                type="button"
                disabled={isSpinning || eligibleCount === 0}
                onClick={handleStartSpin}
                className="px-8 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-extrabold text-sm flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <RefreshCw className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
                <span>
                  {isSpinning
                    ? 'Mengacak Kupon Peserta...'
                    : eligibleCount === 0
                    ? 'Semua Kupon Sudah Diundi'
                    : 'Putar Undian Doorprize Sekarang'}
                </span>
              </button>
            </div>

            {/* Previous Winners History */}
            {winnersList.length > 0 && (
              <div className="border-t border-emerald-800 pt-4">
                <div className="text-xs font-semibold text-amber-300 mb-2">
                  Daftar Pemenang Doorprize Sah ({winnersList.length}):
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {winnersList.map((w) => (
                    <div
                      key={w.id}
                      className="bg-[#021b15] border border-emerald-800/70 rounded-lg px-3 py-2 text-xs flex items-center justify-between gap-2"
                    >
                      <div>
                        <strong className="text-white">{w.namaPeserta}</strong>{' '}
                        <span className="text-slate-400">({w.satkerAtauUmum})</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono-tabular text-amber-300 font-bold mr-2">
                          {w.nomorKupon}
                        </span>
                        <span className="text-emerald-300">{w.hadiahDimenangkan}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
