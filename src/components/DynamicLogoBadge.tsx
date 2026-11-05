import React, { useState } from 'react';
import { BrandingConfig } from '../types/hab';

/**
 * Helper to load an image with crossOrigin="anonymous" and primary->fallback URL chaining.
 */
export function loadAnonymousImage(
  primaryUrl: string,
  fallbackUrl?: string
): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!primaryUrl) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      if (fallbackUrl && fallbackUrl !== primaryUrl) {
        const fallbackImg = new Image();
        fallbackImg.crossOrigin = 'anonymous';
        fallbackImg.onload = () => resolve(fallbackImg);
        fallbackImg.onerror = () => resolve(null);
        fallbackImg.src = fallbackUrl;
      } else {
        resolve(null);
      }
    };
    img.src = primaryUrl;
  });
}

/**
 * Ensures any transparent interior regions inside the Kemenag pentagon shield
 * (especially the "IKHLAS BERAMAL" ribbon, rehal book stand, and cotton blossoms)
 * are filled with pure crisp white (#FFFFFF), while keeping the exterior transparent.
 */
export function ensureWhiteRibbonKemenagCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const w = img.naturalWidth || img.width || 500;
  const h = img.naturalHeight || img.height || 500;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, w, h);

  try {
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const total = w * h;
    const exterior = new Uint8Array(total);
    const queue = new Int32Array(total);
    let head = 0;
    let tail = 0;

    // Seed flood-fill from all 4 outer edges where alpha < 200
    for (let x = 0; x < w; x++) {
      if (data[(0 * w + x) * 4 + 3] < 200) {
        exterior[x] = 1;
        queue[tail++] = x;
      }
      const bIdx = (h - 1) * w + x;
      if (data[bIdx * 4 + 3] < 200 && !exterior[bIdx]) {
        exterior[bIdx] = 1;
        queue[tail++] = bIdx;
      }
    }
    for (let y = 0; y < h; y++) {
      const lIdx = y * w;
      if (data[lIdx * 4 + 3] < 200 && !exterior[lIdx]) {
        exterior[lIdx] = 1;
        queue[tail++] = lIdx;
      }
      const rIdx = y * w + (w - 1);
      if (data[rIdx * 4 + 3] < 200 && !exterior[rIdx]) {
        exterior[rIdx] = 1;
        queue[tail++] = rIdx;
      }
    }

    while (head < tail) {
      const curr = queue[head++];
      const cx = curr % w;
      const cy = (curr / w) | 0;
      if (cx > 0) {
        const n = curr - 1;
        if (!exterior[n] && data[n * 4 + 3] < 200) {
          exterior[n] = 1;
          queue[tail++] = n;
        }
      }
      if (cx < w - 1) {
        const n = curr + 1;
        if (!exterior[n] && data[n * 4 + 3] < 200) {
          exterior[n] = 1;
          queue[tail++] = n;
        }
      }
      if (cy > 0) {
        const n = curr - w;
        if (!exterior[n] && data[n * 4 + 3] < 200) {
          exterior[n] = 1;
          queue[tail++] = n;
        }
      }
      if (cy < h - 1) {
        const n = curr + w;
        if (!exterior[n] && data[n * 4 + 3] < 200) {
          exterior[n] = 1;
          queue[tail++] = n;
        }
      }
    }

    // Composite all interior transparent/semi-transparent pixels over pure white (#FFFFFF)
    for (let i = 0; i < total; i++) {
      if (!exterior[i]) {
        const idx = i * 4;
        const a = data[idx + 3];
        if (a < 255) {
          data[idx] = Math.round((data[idx] * a + 255 * (255 - a)) / 255);
          data[idx + 1] = Math.round((data[idx + 1] * a + 255 * (255 - a)) / 255);
          data[idx + 2] = Math.round((data[idx + 2] * a + 255 * (255 - a)) / 255);
          data[idx + 3] = 255;
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
  } catch {
    // Ignore CORS taint if any custom external domain blocks getImageData
  }

  return canvas;
}

/**
 * Procedural Canvas renderer for the Kemenag Crest when offline or before image texture finishes loading.
 */
export function drawFallbackKemenagCrestOnCanvas(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number
) {
  ctx.save();
  // Shield / Pentagon Emerald Base
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    const x = cx + Math.cos(angle) * radius * 0.88;
    const y = cy + Math.sin(angle) * radius * 0.88;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  const grad = ctx.createRadialGradient(cx, cy - radius * 0.2, radius * 0.1, cx, cy, radius);
  grad.addColorStop(0, '#059669');
  grad.addColorStop(1, '#064e3b');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = Math.max(2, radius * 0.06);
  ctx.strokeStyle = '#fbbf24';
  ctx.stroke();

  // Gold Star at Top Center
  ctx.fillStyle = '#fbbf24';
  ctx.font = `bold ${Math.round(radius * 0.34)}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('★', cx, cy - radius * 0.32);

  // Open Book Motif
  ctx.fillStyle = '#fef3c7';
  ctx.fillRect(cx - radius * 0.28, cy - radius * 0.08, radius * 0.56, radius * 0.28);
  ctx.strokeStyle = '#064e3b';
  ctx.lineWidth = Math.max(1.5, radius * 0.03);
  ctx.strokeRect(cx - radius * 0.28, cy - radius * 0.08, radius * 0.56, radius * 0.28);

  // White Ribbon Banner with Black "IKHLAS BERAMAL" Text
  const ribW = radius * 0.92;
  const ribH = radius * 0.22;
  const ribX = cx - ribW / 2;
  const ribY = cy + radius * 0.31;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = Math.max(1.5, radius * 0.025);
  ctx.beginPath();
  ctx.roundRect(ribX, ribY, ribW, ribH, radius * 0.05);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#000000';
  ctx.font = `800 ${Math.max(8, Math.round(radius * 0.125))}px sans-serif`;
  ctx.fillText('IKHLAS BERAMAL', cx, ribY + ribH / 2 + 1);
  ctx.restore();
}

/**
 * Procedural Canvas renderer for the Dynamic HAB ke-81 Gold & Emerald Emblem.
 */
export function drawProceduralHab81OnCanvas(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number
) {
  ctx.save();

  // Outer 8-pointed Rub el Hizb geometric star
  for (let rot = 0; rot < 2; rot++) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((rot * Math.PI) / 4);
    ctx.beginPath();
    const s = radius * 1.25;
    ctx.rect(-s / 2, -s / 2, s, s);
    const goldGrad = ctx.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2);
    goldGrad.addColorStop(0, '#fde68a');
    goldGrad.addColorStop(0.5, '#d4af37');
    goldGrad.addColorStop(1, '#92400e');
    ctx.fillStyle = goldGrad;
    ctx.fill();
    ctx.restore();
  }

  // Inner Emerald Medallion Core
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.78, 0, Math.PI * 2);
  const emGrad = ctx.createRadialGradient(cx - radius * 0.2, cy - radius * 0.2, radius * 0.1, cx, cy, radius * 0.8);
  emGrad.addColorStop(0, '#047857');
  emGrad.addColorStop(0.7, '#064e3b');
  emGrad.addColorStop(1, '#022c22');
  ctx.fillStyle = emGrad;
  ctx.fill();
  ctx.lineWidth = Math.max(2, radius * 0.05);
  ctx.strokeStyle = '#fbbf24';
  ctx.stroke();

  // "HAB" top label
  ctx.fillStyle = '#fde68a';
  ctx.font = `700 ${Math.max(8, Math.round(radius * 0.2))}px "Plus Jakarta Sans", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('HAB KEMENAG', cx, cy - radius * 0.36);

  // "81" Hero Numeral
  const numGrad = ctx.createLinearGradient(cx, cy - radius * 0.3, cx, cy + radius * 0.35);
  numGrad.addColorStop(0, '#fffbeb');
  numGrad.addColorStop(0.5, '#fbbf24');
  numGrad.addColorStop(1, '#b45309');
  ctx.fillStyle = numGrad;
  ctx.font = `800 ${Math.round(radius * 0.76)}px "Cinzel", Georgia, serif`;
  ctx.fillText('81', cx, cy + radius * 0.04);

  // "2027 • TOUNA" bottom label
  ctx.fillStyle = '#a7f3d0';
  ctx.font = `700 ${Math.max(7, Math.round(radius * 0.17))}px "JetBrains Mono", monospace`;
  ctx.fillText('2027 • TOUNA', cx, cy + radius * 0.45);

  ctx.restore();
}

interface KemenagLogoImgProps {
  branding: BrandingConfig;
  className?: string;
  size?: number;
}

export const KemenagLogoImg: React.FC<KemenagLogoImgProps> = ({
  branding,
  className = 'w-11 h-11',
}) => {
  const [stage, setStage] = useState<'primary' | 'fallback' | 'svg'>('primary');
  const [processedDataUrl, setProcessedDataUrl] = useState<string | null>(null);

  const currentSrc =
    stage === 'primary' ? branding.kemenagLogoPrimaryUrl : branding.kemenagLogoFallbackUrl;

  React.useEffect(() => {
    setProcessedDataUrl(null);
    if (!currentSrc || stage === 'svg') return;
    let active = true;
    loadAnonymousImage(currentSrc).then((img) => {
      if (!active || !img) return;
      try {
        const cleanCanvas = ensureWhiteRibbonKemenagCanvas(img);
        setProcessedDataUrl(cleanCanvas.toDataURL('image/png'));
      } catch {
        // Fallback to raw image if canvas export fails
      }
    });
    return () => {
      active = false;
    };
  }, [currentSrc, stage]);

  if (stage === 'svg' || (!branding.kemenagLogoPrimaryUrl && !branding.kemenagLogoFallbackUrl)) {
    return (
      <div
        className={`${className} inline-flex items-center justify-center rounded-lg bg-emerald-950/90 border border-amber-400/50 p-1 shrink-0`}
        title="Logo Kementerian Agama RI"
      >
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <polygon
            points="32,4 58,22 48,56 16,56 6,22"
            fill="#065f46"
            stroke="#fbbf24"
            strokeWidth="3"
          />
          <circle cx="32" cy="22" r="5" fill="#fbbf24" />
          <rect x="19" y="30" width="26" height="14" rx="2" fill="#fef3c7" stroke="#064e3b" strokeWidth="1.5" />
          <line x1="32" y1="30" x2="32" y2="44" stroke="#064e3b" strokeWidth="1.5" />
          <rect x="14" y="46" width="36" height="7" rx="2" fill="#ffffff" stroke="#0f172a" strokeWidth="1" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={processedDataUrl || currentSrc}
      alt="Logo Resmi Kementerian Agama Republik Indonesia"
      crossOrigin="anonymous"
      referrerPolicy="no-referrer"
      onError={() => {
        if (stage === 'primary' && branding.kemenagLogoFallbackUrl) {
          setStage('fallback');
        } else {
          setStage('svg');
        }
      }}
      className={`${className} object-contain shrink-0`}
    />
  );
};

interface Hab81LogoBadgeProps {
  branding: BrandingConfig;
  className?: string;
}

export const Hab81LogoBadge: React.FC<Hab81LogoBadgeProps> = ({
  branding,
  className = 'w-11 h-11',
}) => {
  const [imgError, setImgError] = useState(false);

  if (branding.habLogoCustomUrl && !imgError) {
    return (
      <img
        src={branding.habLogoCustomUrl}
        alt="Logo Hari Amal Bakti ke-81 Kementerian Agama"
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={`${className} object-contain shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${className} relative inline-flex items-center justify-center shrink-0 select-none`}
      title={branding.habLogoStatusBadge || 'Logo HAB ke-81 Kementerian Agama 2027'}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
        <defs>
          <linearGradient id="habGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#d4af37" />
            <stop offset="100%" stopColor="#92400e" />
          </linearGradient>
          <radialGradient id="habEmeraldGrad" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="65%" stopColor="#064e3b" />
            <stop offset="100%" stopColor="#022c22" />
          </radialGradient>
        </defs>
        {/* Rub el Hizb 8-Pointed Star */}
        <rect
          x="16"
          y="16"
          width="68"
          height="68"
          rx="6"
          fill="url(#habGoldGrad)"
        />
        <rect
          x="16"
          y="16"
          width="68"
          height="68"
          rx="6"
          fill="url(#habGoldGrad)"
          transform="rotate(45 50 50)"
        />
        {/* Inner Emerald Medallion */}
        <circle
          cx="50"
          cy="50"
          r="35"
          fill="url(#habEmeraldGrad)"
          stroke="#fde68a"
          strokeWidth="2.2"
        />
        <text
          x="50"
          y="32"
          textAnchor="middle"
          fill="#fde68a"
          fontSize="8.5"
          fontWeight="700"
          fontFamily="Plus Jakarta Sans, sans-serif"
          letterSpacing="0.8"
        >
          HAB KEMENAG
        </text>
        <text
          x="50"
          y="60"
          textAnchor="middle"
          fill="url(#habGoldGrad)"
          fontSize="31"
          fontWeight="800"
          fontFamily="Cinzel, Georgia, serif"
        >
          81
        </text>
        <text
          x="50"
          y="73"
          textAnchor="middle"
          fill="#a7f3d0"
          fontSize="7.5"
          fontWeight="700"
          fontFamily="JetBrains Mono, monospace"
        >
          2027•TOUNA
        </text>
      </svg>
    </div>
  );
};
