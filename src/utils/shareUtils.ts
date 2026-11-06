/**
 * Utility functions for generating deep-links (?banner=..., ?info=panitia, ?lomba=..., ?kupon=..., ?jadwal=...)
 * and sharing full-resolution images + links directly to WhatsApp.
 */

export const OFFICIAL_GITHUB_PAGES_URL = 'https://irfan45372.github.io/HABKEMENAGTOUNA/';

export function buildDeepLink(params: Record<string, string | null | undefined>): string {
  try {
    const url = new URL(OFFICIAL_GITHUB_PAGES_URL);
    Object.entries(params).forEach(([k, v]) => {
      if (v) {
        url.searchParams.set(k, v);
      }
    });
    return url.toString();
  } catch {
    const query = Object.entries(params)
      .filter(([, v]) => Boolean(v))
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    return `${OFFICIAL_GITHUB_PAGES_URL}${query ? `?${query}` : ''}`;
  }
}

/**
 * Converts any image source (DataURL, SVG DataURL, or HTTP URL) into a crisp JPEG File
 * so WhatsApp on Android/iOS displays it as a full-bleed photo attachment.
 */
export async function imageSourceToJpegFile(
  imageSrc: string,
  fileName = 'hab81-kemenag-touna.jpg'
): Promise<File | null> {
  if (!imageSrc) return null;

  return new Promise((resolve) => {
    const img = new Image();
    if (!imageSrc.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => {
      try {
        const natW = img.naturalWidth || img.width || 1200;
        const natH = img.naturalHeight || img.height || 630;
        const maxDim = 1400;
        const scale = Math.min(1, maxDim / Math.max(natW, natH));
        const width = Math.max(1, Math.round(natW * scale));
        const height = Math.max(1, Math.round(natH * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.fillStyle = '#021b15';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(null);
              return;
            }
            resolve(new File([blob], fileName, { type: 'image/jpeg' }));
          },
          'image/jpeg',
          0.9
        );
      } catch {
        resolve(null);
      }
    };

    img.onerror = () => resolve(null);
    img.src = imageSrc;
  });
}

/**
 * Converts an HTMLCanvasElement directly into a JPEG File for WhatsApp full-image sharing.
 */
export async function canvasToJpegFile(
  canvas: HTMLCanvasElement | null,
  fileName = 'kupon-hab81-touna.jpg'
): Promise<File | null> {
  if (!canvas) return null;
  return new Promise((resolve) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(null);
            return;
          }
          resolve(new File([blob], fileName, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.92
      );
    } catch {
      resolve(null);
    }
  });
}

/**
 * Shares a full image file (if provided and supported by mobile browser) + formatted WhatsApp text & link.
 * Falls back cleanly to wa.me URL when on desktop or when file sharing is unsupported.
 */
export async function shareToWhatsAppWithFullImage(options: {
  title: string;
  waText: string;
  imageSrc?: string;
  canvas?: HTMLCanvasElement | null;
  fileName?: string;
}): Promise<'shared_native' | 'opened_wa'> {
  const { title, waText, imageSrc, canvas, fileName = 'hab81-kemenag-touna.jpg' } = options;

  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      let file: File | null = null;
      if (canvas) {
        file = await canvasToJpegFile(canvas, fileName);
      } else if (imageSrc) {
        file = await imageSourceToJpegFile(imageSrc, fileName);
      }

      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title,
          text: waText,
          files: [file],
        });
        return 'shared_native';
      }
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return 'shared_native';
    }
  }

  const waUrl = `https://wa.me/?text=${encodeURIComponent(waText)}`;
  window.open(waUrl, '_blank', 'noopener,noreferrer');
  return 'opened_wa';
}
