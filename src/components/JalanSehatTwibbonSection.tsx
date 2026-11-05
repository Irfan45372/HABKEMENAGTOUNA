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
  Check,
  CheckCircle2,
  Download,
  Edit3,
  Gift,
  Lock,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Ticket,
  Trash2,
  Trophy,
  Upload,
  X,
  XCircle,
} from 'lucide-react';

interface JalanSehatTwibbonSectionProps {
  branding: BrandingConfig;
  satkerList: string[];
  coupons: JalanSehatCoupon[];
  onAddCoupon: (coupon: JalanSehatCoupon) => void;
  onMarkCouponWinner: (couponId: string, prizeName: string) => void;
  onUpdateCoupon?: (
    couponId: string,
    updatedFields: Pick<JalanSehatCoupon, 'namaPeserta' | 'satkerAtauUmum' | 'nikAtauNip' | 'noHp'>
  ) => void;
  onDeleteCoupon?: (couponId: string) => void;
}

export const JalanSehatTwibbonSection: React.FC<JalanSehatTwibbonSectionProps> = ({
  branding,
  satkerList,
  coupons,
  onAddCoupon,
  onMarkCouponWinner,
  onUpdateCoupon,
  onDeleteCoupon,
}) => {
  const [activeMode, setActiveMode] = useState<'kupon' | 'verifikasi' | 'twibbon'>('kupon');

  // Coupon Registration Form State
  const [namaPeserta, setNamaPeserta] = useState<string>('');
  const [satkerAtauUmum, setSatkerAtauUmum] = useState<string>(satkerList[0] || 'Masyarakat Umum');
  const [nikAtauNip, setNikAtauNip] = useState<string>('');
  const [noHp, setNoHp] = useState<string>('');
  const [couponError, setCouponError] = useState<string | null>(null);

  // Inline Edit State for Participant Data (Nomor Undian & Barcode Locked)
  const [isEditingActiveCoupon, setIsEditingActiveCoupon] = useState<boolean>(false);
  const [editNama, setEditNama] = useState<string>('');
  const [editSatker, setEditSatker] = useState<string>('');
  const [editNik, setEditNik] = useState<string>('');
  const [editHp, setEditHp] = useState<string>('');
  const [editNotice, setEditNotice] = useState<string | null>(null);

  // Verification / Scanner State
  const [verifyQuery, setVerifyQuery] = useState<string>('');
  const [verifiedCoupon, setVerifiedCoupon] = useState<JalanSehatCoupon | null>(null);
  const [verifySearched, setVerifySearched] = useState<boolean>(false);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraStatus, setCameraStatus] = useState<string | null>(null);
  const videoScannerRef = useRef<HTMLVideoElement | null>(null);

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

  // Sync activeCoupon when coupons array updates (e.g., after edit or delete)
  useEffect(() => {
    const updated = coupons.find((c) => c.id === activeCoupon.id);
    if (updated) {
      setActiveCoupon(updated);
    } else if (coupons.length > 0) {
      setActiveCoupon(coupons[0]);
    }
  }, [coupons]);

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

  // Check URL query parameter ?kupon=... when scanned from phone camera QR
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const scannedKupon = params.get('kupon');
      if (scannedKupon) {
        const clean = scannedKupon.trim().toUpperCase();
        setVerifyQuery(clean);
        const found =
          coupons.find(
            (c) =>
              c.nomorKupon.toUpperCase() === clean ||
              c.nomorKupon.toUpperCase().includes(clean)
          ) || null;
        setVerifiedCoupon(found);
        setVerifySearched(true);
        setActiveMode('verifikasi');
        const el = document.getElementById('jalan-sehat');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }
    } catch {
      // Ignore URL parse errors
    }
  }, [coupons]);

  // Stop camera stream when leaving verification mode
  useEffect(() => {
    if (activeMode !== 'verifikasi' && cameraActive) {
      stopCameraScanner();
    }
    return () => {
      stopCameraScanner();
    };
  }, [activeMode]);

  const stopCameraScanner = () => {
    setCameraActive(false);
    const vid = videoScannerRef.current;
    if (vid && vid.srcObject) {
      const stream = vid.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      vid.srcObject = null;
    }
  };

  const runCouponLookup = (rawInput: string) => {
    const clean = rawInput.trim();
    if (!clean) return;
    let token = clean;
    if (clean.includes('kupon=')) {
      const match = clean.match(/kupon=([A-Za-z0-9-]+)/i);
      if (match?.[1]) token = match[1];
    } else if (clean.includes('|')) {
      token = clean.split('|')[0].trim();
    }
    const upper = token.toUpperCase();
    const found =
      coupons.find(
        (c) =>
          c.nomorKupon.toUpperCase() === upper ||
          c.nomorKupon.toUpperCase().includes(upper) ||
          c.nikAtauNip.toLowerCase() === clean.toLowerCase() ||
          c.namaPeserta.toLowerCase().includes(clean.toLowerCase())
      ) || null;
    setVerifyQuery(token);
    setVerifiedCoupon(found);
    setVerifySearched(true);
  };

  const handleStartCameraScanner = async () => {
    setCameraStatus(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      setCameraActive(true);
      setCameraStatus('Arahkan kamera ke Kode QR pada Kupon Peserta...');
      window.setTimeout(() => {
        if (videoScannerRef.current) {
          videoScannerRef.current.srcObject = stream;
          videoScannerRef.current.play().catch(() => {});
        }
      }, 100);

      const WinWithBarcode = window as unknown as {
        BarcodeDetector?: new (opts: { formats: string[] }) => {
          detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
        };
      };

      if (WinWithBarcode.BarcodeDetector) {
        const detector = new WinWithBarcode.BarcodeDetector({ formats: ['qr_code'] });
        const scanInterval = window.setInterval(async () => {
          const vid = videoScannerRef.current;
          if (!vid || vid.readyState < 2) return;
          try {
            const barcodes = await detector.detect(vid);
            if (barcodes.length > 0 && barcodes[0].rawValue) {
              window.clearInterval(scanInterval);
              stopCameraScanner();
              runCouponLookup(barcodes[0].rawValue);
            }
          } catch {
            // Continue scanning frames
          }
        }, 400);
      } else {
        setCameraStatus(
          'Kamera aktif. Jika browser Anda belum mendukung auto-detect, Anda juga bisa memindai QR langsung dari aplikasi Kamera HP bawaan atau mengetik 4 angka kupon di bawah.'
        );
      }
    } catch {
      setCameraStatus(
        'Izin kamera belum diberikan atau perangkat tidak memiliki kamera. Gunakan kotak pencarian Nomor Kupon / NIP di bawah.'
      );
    }
  };

  // Start editing active coupon participant details (Nomor Undian & Barcode stay locked)
  const handleStartEditCoupon = (target: JalanSehatCoupon) => {
    setActiveCoupon(target);
    setEditNama(target.namaPeserta);
    setEditSatker(target.satkerAtauUmum);
    setEditNik(target.nikAtauNip);
    setEditHp(target.noHp);
    setIsEditingActiveCoupon(true);
    setEditNotice(null);
  };

  const handleSaveEditCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNama.trim() || editNama.trim().length < 2) return;
    const updatedFields = {
      namaPeserta: editNama.trim(),
      satkerAtauUmum: editSatker.trim() || 'Masyarakat Umum',
      nikAtauNip: editNik.trim() || '-',
      noHp: editHp.trim() || '-',
    };
    if (onUpdateCoupon) {
      onUpdateCoupon(activeCoupon.id, updatedFields);
    }
    setActiveCoupon((prev) => ({
      ...prev,
      ...updatedFields,
      // nomorKupon & id remain strictly locked!
    }));
    setIsEditingActiveCoupon(false);
    setEditNotice(
      `Data peserta berhasil diperbarui. Nomor Undian (${activeCoupon.nomorKupon}) & Barcode QR tetap permanen.`
    );
    window.setTimeout(() => setEditNotice(null), 4000);
  };

  const handleDeleteCouponItem = (couponId: string, nomorKupon: string) => {
    if (onDeleteCoupon) {
      onDeleteCoupon(couponId);
      setEditNotice(`Kupon ${nomorKupon} telah dihapus dari daftar.`);
      window.setTimeout(() => setEditNotice(null), 3500);
    }
  };

  // Render High-Res Digital Ticket Card on HTML5 Canvas whenever activeCoupon or branding changes
  useEffect(() => {
    let cancelled = false;
    const renderTicketCanvas = async () => {
      const canvas = ticketCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // QR Code depends EXCLUSIVELY on activeCoupon.nomorKupon so editing name/NIP never changes the barcode!
      const baseSiteUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}${window.location.pathname}`
          : 'https://irfan45372.github.io/HABKEMENAGTOUNA/';
      const qrPayloadUrl = `${baseSiteUrl}?kupon=${encodeURIComponent(activeCoupon.nomorKupon)}#jalan-sehat`;
      const realQrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=210x210&margin=0&color=022c22&bgcolor=ffffff&data=${encodeURIComponent(
        qrPayloadUrl
      )}`;

      const [kemenagImg, habImg, realQrImg] = await Promise.all([
        loadAnonymousImage(branding.kemenagLogoPrimaryUrl, branding.kemenagLogoFallbackUrl),
        branding.habLogoCustomUrl
          ? loadAnonymousImage(branding.habLogoCustomUrl)
          : Promise.resolve(null),
        loadAnonymousImage(realQrApiUrl),
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

      // Right Stub: Real Scannable QR Code (with deterministic offline matrix fallback keyed ONLY by nomorKupon)
      const qrBoxSize = 189; // 21 * 9
      const qrX = 645;
      const qrY = 76;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(qrX - 12, qrY - 12, qrBoxSize + 24, qrBoxSize + 24);
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 3;
      ctx.strokeRect(qrX - 12, qrY - 12, qrBoxSize + 24, qrBoxSize + 24);

      if (realQrImg) {
        ctx.drawImage(realQrImg, qrX, qrY, qrBoxSize, qrBoxSize);
      } else {
        const qrMatrix = generateQrMatrix(`${activeCoupon.nomorKupon}|HAB81TOUNA`);
        const cell = 9;
        ctx.fillStyle = '#022c22';
        for (let r = 0; r < qrMatrix.length; r++) {
          for (let c = 0; c < qrMatrix[r].length; c++) {
            if (qrMatrix[r][c] === 1) {
              ctx.fillRect(qrX + c * cell, qrY + r * cell, cell, cell);
            }
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
        const scale = Math.max(
          (radius * 2) / userPhoto.width,
          (radius * 2) / userPhoto.height
        );
        const dw = userPhoto.width * scale;
        const dh = userPhoto.height * scale;
        ctx.drawImage(userPhoto, cx - dw / 2, cy - dh / 2, dw, dh);
      } else {
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

    // Ensure unique sequence number based on highest existing sequence
    const maxExistingSeq = coupons.reduce((max, c) => {
      const parts = c.nomorKupon.split('-');
      const seqNum = parts.length >= 3 ? parseInt(parts[2], 10) : 0;
      return !Number.isNaN(seqNum) && seqNum > max ? seqNum : max;
    }, 0);
    const nextSeq = maxExistingSeq + 1;
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

  // Lucky Draw Spinner Handler — Automatically removes drawn coupon from Daftar Undian Aktif!
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
          // Mark coupon as won so it is immediately removed from Daftar Undian Aktif
          onMarkCouponWinner(winner.id, prizeInput);
        }
        setIsSpinning(false);
      }
    }, 65);
  };

  const eligibleCoupons = coupons.filter((c) => !c.sudahMenang);
  const eligibleCount = eligibleCoupons.length;
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
            Dapatkan Kupon QR Digital resmi dengan Nomor Tiket unik untuk pengundian Doorprize Panggung Utama, verifikasi keaslian kupon, atau buat Bingkai Twibbon ucapan selamat HAB ke-81.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="tablist"
            className="flex flex-wrap items-center gap-1.5 bg-[#03221a] p-1.5 rounded-xl border border-emerald-800/80"
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
              <span>Generator Kupon QR</span>
            </button>
            <button
              role="tab"
              aria-selected={activeMode === 'verifikasi'}
              type="button"
              onClick={() => setActiveMode('verifikasi')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeMode === 'verifikasi'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Scan & Verifikasi Panitia</span>
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
            <span>Mesin Undian Doorprize ({eligibleCount} Antrean Aktif)</span>
          </button>
        </div>
      </div>

      {/* MODE 1: JALAN SEHAT QR COUPON GENERATOR */}
      {activeMode === 'kupon' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left 5 Cols: Quick Registration Form & Active Draw Queue */}
          <div className="lg:col-span-5 bg-[#03251c] border border-emerald-800/80 rounded-2xl p-6 space-y-4">
            <form onSubmit={handleGenerateCoupon} className="space-y-4">
              <div className="border-b border-emerald-800/70 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-amber-400" />
                  Registrasi Cepat Kupon Jalan Sehat
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Isi data diri untuk menerbitkan kartu kupon digital ber-QR Code resmi
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
            </form>

            {/* Active Draw Queue List (Coupons that have been drawn automatically leave this list) */}
            <div className="pt-3 border-t border-emerald-800/70 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-emerald-300">
                  Daftar Undian Aktif ({eligibleCoupons.length} Kupon Belum Diundi):
                </div>
                <span className="text-[10px] text-slate-400">
                  Klik Edit/Hapus jika data keliru
                </span>
              </div>

              {eligibleCoupons.length === 0 ? (
                <div className="p-3 rounded-lg bg-[#021b15] text-xs text-slate-400 text-center">
                  Seluruh kupon telah selesai diundi atau belum ada kupon aktif.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {eligibleCoupons.map((c) => (
                    <div
                      key={c.id}
                      className={`px-3 py-2 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors ${
                        activeCoupon.id === c.id
                          ? 'bg-emerald-800/80 text-white border border-amber-400/50'
                          : 'bg-[#021b15] text-slate-300 hover:text-white'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setActiveCoupon(c);
                          setIsEditingActiveCoupon(false);
                        }}
                        className="flex-1 text-left min-w-0 cursor-pointer"
                      >
                        <div className="truncate font-semibold">{c.namaPeserta}</div>
                        <div className="font-mono-tabular text-[11px] text-amber-300">
                          {c.nomorKupon} · {c.satkerAtauUmum}
                        </div>
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEditCoupon(c)}
                          title="Edit Nama / Data Peserta (Nomor Undian & Barcode Terkunci)"
                          className="px-2 py-1 rounded bg-[#03251c] hover:bg-emerald-900 border border-emerald-700 text-amber-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        {onDeleteCoupon && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCouponItem(c.id, c.nomorKupon)}
                            title="Hapus Kupon"
                            className="p-1.5 rounded bg-rose-950/90 hover:bg-rose-900 text-rose-300 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right 7 Cols: Live Digital Ticket Canvas, Edit Participant Data & Download */}
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

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (isEditingActiveCoupon) {
                      setIsEditingActiveCoupon(false);
                    } else {
                      handleStartEditCoupon(activeCoupon);
                    }
                  }}
                  className="px-3 py-2 rounded-lg bg-[#021b15] hover:bg-emerald-900 border border-amber-400/50 text-amber-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEditingActiveCoupon ? 'Batal Edit' : 'Edit Data Peserta'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    runCouponLookup(activeCoupon.nomorKupon);
                    setActiveMode('verifikasi');
                  }}
                  className="px-3 py-2 rounded-lg bg-[#021b15] hover:bg-emerald-900 border border-emerald-700 text-emerald-300 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Uji Verifikasi</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadTicketPng}
                  className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Unduh Kupon PNG
                </button>
              </div>
            </div>

            {editNotice && (
              <div className="p-3 rounded-xl bg-emerald-950/90 border border-emerald-500/60 text-xs text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
                <span>{editNotice}</span>
              </div>
            )}

            {/* Inline Editor for Participant Data (Nomor Undian & QR Barcode Locked) */}
            {isEditingActiveCoupon && (
              <form
                onSubmit={handleSaveEditCoupon}
                className="bg-[#021b15] border-2 border-amber-400/70 rounded-xl p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-800/80 pb-2">
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Koreksi Data Peserta Kupon (Nama / Satker / NIP / No. HP)</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded bg-emerald-950 border border-emerald-700 text-[11px] text-emerald-300 font-mono-tabular flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-400" />
                    Nomor & Barcode Terkunci: {activeCoupon.nomorKupon}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Nomor Undian & Barcode QR (Terkunci Permanen)
                    </label>
                    <input
                      type="text"
                      value={activeCoupon.nomorKupon}
                      disabled
                      readOnly
                      className="w-full px-3 py-2 rounded-lg bg-slate-900/90 border border-slate-700 text-amber-300/80 font-mono-tabular font-bold cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-200 mb-1">
                      Nama Lengkap Peserta *
                    </label>
                    <input
                      type="text"
                      value={editNama}
                      onChange={(e) => setEditNama(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#03251c] border border-emerald-700 text-white font-semibold focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-200 mb-1">
                      Satker / Utusan / Umum
                    </label>
                    <input
                      type="text"
                      value={editSatker}
                      onChange={(e) => setEditSatker(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#03251c] border border-emerald-700 text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-200 mb-1">
                        NIP / NIK
                      </label>
                      <input
                        type="text"
                        value={editNik}
                        onChange={(e) => setEditNik(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[#03251c] border border-emerald-700 text-white font-mono-tabular focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-200 mb-1">
                        No. HP / WA
                      </label>
                      <input
                        type="text"
                        value={editHp}
                        onChange={(e) => setEditHp(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[#03251c] border border-emerald-700 text-white font-mono-tabular focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  {onDeleteCoupon ? (
                    <button
                      type="button"
                      onClick={() => {
                        handleDeleteCouponItem(activeCoupon.id, activeCoupon.nomorKupon);
                        setIsEditingActiveCoupon(false);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-rose-950 hover:bg-rose-900 border border-rose-600/50 text-rose-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Kupon Ini</span>
                    </button>
                  ) : (
                    <div />
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingActiveCoupon(false)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-950 text-slate-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Batal</span>
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Simpan Perubahan Data</span>
                    </button>
                  </div>
                </div>
              </form>
            )}

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
                Nomor Undian & Barcode QR bersifat permanen · Kupon yang menang otomatis keluar dari daftar undian
              </span>
              <span className="font-mono-tabular">
                Antrean Undian: {eligibleCount} Aktif / {coupons.length} Total
              </span>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: SCAN & VERIFIKASI KUPON PANITIA */}
      {activeMode === 'verifikasi' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left 5 Cols: Search / Camera Scanner Input */}
          <div className="lg:col-span-5 bg-[#03251c] border border-emerald-800/80 rounded-2xl p-6 space-y-5">
            <div className="border-b border-emerald-800/70 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                Meja Verifikasi Kupon Panitia
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Digunakan saat peserta pemenang undian naik ke panggung untuk mencocokkan keaslian Kupon QR, NIP/NIK, dan status hadiah.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                runCouponLookup(verifyQuery);
              }}
              className="space-y-3"
            >
              <label className="block text-xs font-semibold text-slate-200">
                Ketik Nomor Kupon / 4 Angka Urut / NIP / Nama Peserta:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={verifyQuery}
                  onChange={(e) => setVerifyQuery(e.target.value)}
                  placeholder="Contoh: HAB81-TOUNA-0001-81 atau 0001"
                  className="flex-1 px-3.5 py-2.5 rounded-lg bg-[#021b15] border border-emerald-700 text-xs text-white font-mono-tabular focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Search className="w-4 h-4" />
                  <span>Verifikasi</span>
                </button>
              </div>
            </form>

            {/* Camera QR Scanner Toggle */}
            <div className="pt-3 border-t border-emerald-800/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-300">
                  Pemindai Kamera QR Langsung:
                </span>
                {!cameraActive ? (
                  <button
                    type="button"
                    onClick={handleStartCameraScanner}
                    className="px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-amber-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Aktifkan Kamera Scan QR</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopCameraScanner}
                    className="px-3 py-1.5 rounded-lg bg-rose-900 hover:bg-rose-800 text-white text-xs font-bold cursor-pointer"
                  >
                    Matikan Kamera
                  </button>
                )}
              </div>

              {cameraActive && (
                <div className="rounded-xl overflow-hidden border-2 border-amber-400 bg-black aspect-video relative">
                  <video
                    ref={videoScannerRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                  />
                </div>
              )}

              {cameraStatus && (
                <p className="text-[11px] text-amber-200 bg-[#021b15] border border-emerald-800 rounded-lg p-2.5">
                  {cameraStatus}
                </p>
              )}
            </div>

            {/* How It Works Info Box */}
            <div className="bg-[#021b15] border border-emerald-800/80 rounded-xl p-3.5 space-y-1.5 text-xs text-slate-300">
              <div className="font-bold text-amber-300">
                3 Cara Kerja Scan Verifikasi Panitia:
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed">
                <li>
                  <strong>Scan via Kamera HP Biasa / Google Lens:</strong> Arahkan kamera HP ke QR Code pada kupon peserta, maka HP panitia otomatis membuka halaman ini dan menampilkan status sah peserta.
                </li>
                <li>
                  <strong>Scan via Tombol Kamera di Atas:</strong> Panitia menekan tombol <em>Aktifkan Kamera Scan QR</em> lalu mengarahkan kupon peserta ke layar.
                </li>
                <li>
                  <strong>Cek Cepat 4 Digit Nomor Kupon:</strong> Ketik langsung nomor urut (misal <code className="text-amber-300">0001</code>) atau NIP/NIK peserta pada kotak pencarian.
                </li>
              </ol>
            </div>
          </div>

          {/* Right 7 Cols: Verification Result Card */}
          <div className="lg:col-span-7 bg-[#03251c] border border-emerald-800/80 rounded-2xl p-6 space-y-5">
            <h3 className="text-base font-bold text-white border-b border-emerald-800/70 pb-3">
              Hasil Pemeriksaan Keaslian Kupon Peserta
            </h3>

            {!verifySearched ? (
              <div className="py-12 text-center space-y-3 text-slate-300">
                <QrCode className="w-12 h-12 text-amber-400/70 mx-auto" />
                <div className="text-sm font-bold text-white">
                  Siap Memverifikasi Kupon Peserta Jalan Sehat
                </div>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Silakan pindai QR Code kupon peserta atau masukkan Nomor Kupon di sebelah kiri untuk melihat rincian data peserta dan status klaim hadiah.
                </p>
              </div>
            ) : verifiedCoupon ? (
              <div className="bg-[#021b15] border-2 border-emerald-500 rounded-2xl p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-800 pb-4">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" />
                    <div>
                      <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-[11px] font-bold">
                        KUPON SAH & TERDAFTAR RESMI
                      </span>
                      <h4 className="font-mono-tabular text-xl font-extrabold text-amber-300 mt-1">
                        {verifiedCoupon.nomorKupon}
                      </h4>
                    </div>
                  </div>

                  {verifiedCoupon.sudahMenang ? (
                    <span className="px-3 py-1.5 rounded-lg bg-amber-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5">
                      <Trophy className="w-4 h-4" />
                      <span>SUDAH KELUAR DI UNDIAN (PEMENANG)</span>
                    </span>
                  ) : (
                    <span className="px-3 py-1.5 rounded-lg bg-emerald-900/90 border border-emerald-600 text-emerald-200 text-xs font-semibold">
                      Aktif di Daftar Undian · Belum Menang
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="bg-[#03251c] p-3 rounded-xl border border-emerald-800/70">
                    <span className="text-slate-400 block mb-0.5">Nama Lengkap Peserta</span>
                    <strong className="text-sm text-white">{verifiedCoupon.namaPeserta}</strong>
                  </div>
                  <div className="bg-[#03251c] p-3 rounded-xl border border-emerald-800/70">
                    <span className="text-slate-400 block mb-0.5">Utusan Satker / Umum</span>
                    <strong className="text-sm text-amber-300">
                      {verifiedCoupon.satkerAtauUmum}
                    </strong>
                  </div>
                  <div className="bg-[#03251c] p-3 rounded-xl border border-emerald-800/70">
                    <span className="text-slate-400 block mb-0.5">NIP / NIK Terdaftar</span>
                    <strong className="text-sm text-white font-mono-tabular">
                      {verifiedCoupon.nikAtauNip || '-'}
                    </strong>
                  </div>
                  <div className="bg-[#03251c] p-3 rounded-xl border border-emerald-800/70">
                    <span className="text-slate-400 block mb-0.5">Waktu Registrasi & No. HP</span>
                    <strong className="text-sm text-white">
                      {verifiedCoupon.waktuRegistrasi} ({verifiedCoupon.noHp || '-'})
                    </strong>
                  </div>
                </div>

                {verifiedCoupon.sudahMenang && (
                  <div className="bg-amber-400/15 border border-amber-400/50 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="text-amber-200 block">Hadiah Doorprize yang Dimenangkan:</span>
                      <strong className="text-sm text-amber-300">
                        {verifiedCoupon.hadiahDimenangkan || 'Doorprize Utama HAB ke-81'}
                      </strong>
                    </div>
                    <CheckCircle2 className="w-6 h-6 text-amber-300 shrink-0" />
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-rose-950/60 border-2 border-rose-500/70 rounded-2xl p-6 text-center space-y-2">
                <XCircle className="w-10 h-10 text-rose-400 mx-auto" />
                <div className="text-base font-bold text-white">
                  Kupon &ldquo;{verifyQuery}&rdquo; Tidak Ditemukan
                </div>
                <p className="text-xs text-rose-200 max-w-md mx-auto">
                  Nomor kupon tersebut tidak terdaftar di database lokal perangkat ini. Pastikan perangkat panitia sudah menarik data JSON terbaru atau periksa kembali 4 digit nomor urut kupon.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODE 3: TWIBBON STUDIO HAB KE-81 */}
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
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-[#03251c] border-2 border-amber-400 rounded-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl my-auto">
            <div className="flex items-start justify-between gap-4 border-b border-emerald-800 pb-4">
              <div>
                <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  PANGGUNG UTAMA JALAN SEHAT KERUKUNAN HAB KE-81
                </div>
                <h3 id="lucky-draw-title" className="font-display text-2xl font-bold text-white mt-0.5">
                  Mesin Undian Kupon QR Digital (Lucky Draw)
                </h3>
                <p className="text-xs text-emerald-300 mt-0.5">
                  Nomor kupon yang terpilih otomatis dihapus dari antrean daftar undian sehingga tidak akan terundi dua kali.
                </p>
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
                Sisa Daftar Undian: <strong className="text-amber-300">{eligibleCount}</strong> Kupon
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
                <div className="pt-2 space-y-1">
                  <div className="text-xs font-semibold text-emerald-300 flex items-center justify-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span>Selamat! Memenangkan: {prizeInput}</span>
                  </div>
                  <div className="text-[11px] text-amber-200/90">
                    ✓ Nomor kupon {drawnWinner.nomorKupon} telah otomatis dihapus dari daftar antrean undian.
                  </div>
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

            {/* Two-Column Summary: Remaining Draw Pool vs Drawn Winners */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-emerald-800 pt-4">
              {/* Remaining Active Draw Pool */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-emerald-300">
                  Daftar Antrean Undian Tersisa ({eligibleCoupons.length}):
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {eligibleCoupons.length === 0 ? (
                    <div className="text-[11px] text-slate-400 bg-[#021b15] p-2.5 rounded-lg">
                      Tidak ada kupon tersisa dalam antrean undian.
                    </div>
                  ) : (
                    eligibleCoupons.map((c) => (
                      <div
                        key={c.id}
                        className="bg-[#021b15] border border-emerald-800/60 rounded-lg px-2.5 py-1.5 text-[11px] flex items-center justify-between gap-2"
                      >
                        <span className="font-mono-tabular text-amber-300 font-bold">
                          {c.nomorKupon}
                        </span>
                        <span className="text-slate-200 truncate">{c.namaPeserta}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Drawn Winners (Removed from Active Draw Pool) */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-amber-300">
                  Sudah Diundi / Keluar dari Antrean ({winnersList.length}):
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {winnersList.length === 0 ? (
                    <div className="text-[11px] text-slate-400 bg-[#021b15] p-2.5 rounded-lg">
                      Belum ada nomor yang ditarik mesin undian.
                    </div>
                  ) : (
                    winnersList.map((w) => (
                      <div
                        key={w.id}
                        className="bg-[#021b15] border border-amber-400/40 rounded-lg px-2.5 py-1.5 text-[11px] flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="font-mono-tabular text-amber-300 font-bold">
                            {w.nomorKupon}
                          </div>
                          <div className="text-white truncate">{w.namaPeserta}</div>
                          <div className="text-[10px] text-emerald-300 truncate">
                            {w.hadiahDimenangkan}
                          </div>
                        </div>
                        {onDeleteCoupon && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCouponItem(w.id, w.nomorKupon)}
                            title="Hapus permanen jika pemenang gugur/tidak hadir"
                            className="p-1.5 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 shrink-0 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
