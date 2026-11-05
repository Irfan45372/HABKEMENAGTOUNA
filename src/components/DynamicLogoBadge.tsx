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

  // Ribbon motto
  ctx.fillStyle = '#fbbf24';
  ctx.font = `700 ${Math.max(8, Math.round(radius * 0.14))}px sans-serif`;
  ctx.fillText('IKHLAS BERAMAL', cx, cy + radius * 0.42);
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
        </svg>
      </div>
    );
  }

  const currentSrc =
    stage === 'primary' ? branding.kemenagLogoPrimaryUrl : branding.kemenagLogoFallbackUrl;

  return (
    <img
      src={currentSrc}
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
