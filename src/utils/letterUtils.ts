import { AnnouncementLetter } from '../types/hab';

/**
 * Extracts readable paragraphs from a .docx (ZIP containing word/document.xml)
 * using the browser's native DecompressionStream('deflate-raw') and DOMParser.
 */
export async function extractTextFromDocxBuffer(buffer: ArrayBuffer): Promise<string> {
  try {
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);

    // Locate Central Directory at the end of the ZIP file (EOCD signature 0x06054b50)
    let eocdOffset = -1;
    const minEocdSearch = Math.max(0, bytes.length - 65557);
    for (let i = bytes.length - 22; i >= minEocdSearch; i--) {
      if (view.getUint32(i, true) === 0x06054b50) {
        eocdOffset = i;
        break;
      }
    }

    if (eocdOffset === -1) return '';

    const cdEntries = view.getUint16(eocdOffset + 10, true);
    const cdOffset = view.getUint32(eocdOffset + 16, true);

    let ptr = cdOffset;
    const decoder = new TextDecoder('utf-8');

    for (let entry = 0; entry < cdEntries && ptr + 46 <= bytes.length; entry++) {
      if (view.getUint32(ptr, true) !== 0x02014b50) break;

      const compressionMethod = view.getUint16(ptr + 10, true);
      const compressedSize = view.getUint32(ptr + 20, true);
      const nameLen = view.getUint16(ptr + 28, true);
      const extraLen = view.getUint16(ptr + 30, true);
      const commentLen = view.getUint16(ptr + 32, true);
      const localHeaderOffset = view.getUint32(ptr + 42, true);

      const fileName = decoder.decode(bytes.subarray(ptr + 46, ptr + 46 + nameLen));
      ptr += 46 + nameLen + extraLen + commentLen;

      if (fileName === 'word/document.xml') {
        if (localHeaderOffset + 30 > bytes.length) break;
        const localNameLen = view.getUint16(localHeaderOffset + 26, true);
        const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
        const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
        const compressedSlice = bytes.subarray(dataStart, dataStart + compressedSize);

        let xmlString = '';
        if (compressionMethod === 0) {
          xmlString = decoder.decode(compressedSlice);
        } else if (compressionMethod === 8 && typeof DecompressionStream !== 'undefined') {
          const ds = new DecompressionStream('deflate-raw');
          const writer = ds.writable.getWriter();
          void writer.write(compressedSlice);
          void writer.close();
          const decompressedBuf = await new Response(ds.readable).arrayBuffer();
          xmlString = decoder.decode(new Uint8Array(decompressedBuf));
        }

        if (!xmlString) return '';

        const xmlDoc = new DOMParser().parseFromString(xmlString, 'application/xml');
        const paragraphs: string[] = [];
        const pNodes = Array.from(xmlDoc.getElementsByTagName('*')).filter(
          (el) => el.localName === 'p'
        );

        for (const p of pNodes) {
          const texts: string[] = [];
          const children = Array.from(p.getElementsByTagName('*'));
          for (const child of children) {
            if (child.localName === 't' && child.textContent) {
              texts.push(child.textContent);
            } else if (child.localName === 'tab') {
              texts.push('\t');
            } else if (child.localName === 'br') {
              texts.push('\n');
            }
          }
          const line = texts.join('').trim();
          if (line) {
            paragraphs.push(line);
          }
        }

        return paragraphs.join('\n\n');
      }
    }
  } catch {
    // Ignore parse error and fallback to manual text
  }
  return '';
}

/**
 * Reads an uploaded Word (.docx / .doc) or PDF (.pdf) file and returns an AnnouncementLetter object.
 */
export async function processUploadedLetterFile(file: File): Promise<{
  letter: Omit<AnnouncementLetter, 'id' | 'waktuUpload'>;
  oversizeNotice?: string;
}> {
  const lowerName = file.name.toLowerCase();
  const isPdf = lowerName.endsWith('.pdf') || file.type === 'application/pdf';
  const fileType: 'pdf' | 'word' = isPdf ? 'pdf' : 'word';
  const mimeType =
    file.type ||
    (isPdf
      ? 'application/pdf'
      : lowerName.endsWith('.docx')
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : 'application/msword');

  const fileSizeKb = Math.max(1, Math.round(file.size / 1024));

  // Extract readable text automatically if .docx
  let extractedText = '';
  if (lowerName.endsWith('.docx')) {
    const buf = await file.arrayBuffer();
    extractedText = await extractTextFromDocxBuffer(buf);
  }

  // Keep raw DataURL up to 680KB so portalConfig/main stays safely under Firestore's 1MB limit
  let fileDataUrl: string | undefined;
  let oversizeNotice: string | undefined;

  if (file.size <= 680 * 1024) {
    fileDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => reject(new Error('Gagal membaca file surat'));
      reader.readAsDataURL(file);
    });
  } else {
    oversizeNotice = isPdf
      ? `Ukuran file PDF (${fileSizeKb} KB) melebihi batas penyimpanan langsung Cloud (maks ~680 KB). Silakan lampirkan Link Google Drive surat atau ketik/tempel isi surat di bawah agar tetap tampil di semua perangkat.`
      : `File Word (${fileSizeKb} KB) cukup besar, namun isi teks surat telah berhasil diekstrak otomatis agar dapat dibaca langsung oleh pengguna.`;
  }

  return {
    letter: {
      fileName: file.name,
      fileType,
      mimeType,
      fileSizeKb,
      fileDataUrl,
      isiSuratTeks: extractedText || undefined,
    },
    oversizeNotice,
  };
}

/**
 * Converts a base64 DataURL into a Blob Object URL so PDFs and Word files can be rendered
 * inside an <iframe> or downloaded reliably without browser DataURL length limitations.
 */
export function createBlobUrlFromDataUrl(dataUrl?: string): string | null {
  if (!dataUrl || !dataUrl.startsWith('data:')) return null;
  try {
    const commaIdx = dataUrl.indexOf(',');
    if (commaIdx === -1) return null;
    const header = dataUrl.slice(0, commaIdx);
    const base64 = dataUrl.slice(commaIdx + 1);
    const mimeMatch = header.match(/data:([^;]+)/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';

    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mime });
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

/**
 * Normalizes external Google Drive or document links into embeddable preview URLs when possible.
 */
export function getEmbeddableDocumentUrl(externalUrl?: string): string | null {
  if (!externalUrl) return null;
  const trimmed = externalUrl.trim();
  if (!trimmed) return null;

  // Google Drive /file/d/<ID>/view -> /file/d/<ID>/preview
  const driveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch?.[1]) {
    return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
  }

  // Google Docs /document/d/<ID>/edit -> /document/d/<ID>/preview
  const docsMatch = trimmed.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (docsMatch?.[1]) {
    return `https://docs.google.com/document/d/${docsMatch[1]}/preview`;
  }

  if (trimmed.toLowerCase().endsWith('.pdf')) {
    return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(trimmed)}`;
  }

  if (trimmed.toLowerCase().endsWith('.docx') || trimmed.toLowerCase().endsWith('.doc')) {
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(trimmed)}`;
  }

  return trimmed;
}

/**
 * Extracts the first N words (default 6 words) of the announcement redaksi
 * so users in WhatsApp groups immediately see what the announcement is about.
 */
export function getAnnouncementSnippetWords(text: string, wordCount = 6): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'Pengumuman Resmi Panitia HAB ke-81';
  const words = cleaned.split(' ');
  if (words.length <= wordCount) return cleaned;
  return `${words.slice(0, wordCount).join(' ')}...`;
}

/**
 * Builds a readable 6-word URL slug from the announcement redaksi
 * so even the URL itself visibly displays the announcement topic in WhatsApp.
 */
export function getAnnouncementUrlSlug(text: string, wordCount = 6): string {
  const cleaned = text
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return 'Pengumuman-Panitia-HAB-81';
  return cleaned.split(' ').slice(0, wordCount).join('-');
}

/**
 * Formats the clipboard / WhatsApp message so that pasting into a WhatsApp Group
 * always displays the 6-word redaksi headline, the full announcement redaksi,
 * attached letter details (if any), and the direct link.
 */
export function formatAnnouncementWhatsAppText(options: {
  text: string;
  index?: number;
  letter?: AnnouncementLetter | null;
  url: string;
}): string {
  const { text, index, letter, url } = options;
  const snippet = getAnnouncementSnippetWords(text, 6);
  const numLabel = index !== undefined ? ` #${index + 1}` : '';
  const letterInfo = letter
    ? `\n📎 *Lampiran Surat Resmi:* ${letter.perihalSurat || letter.fileName}${
        letter.nomorSurat ? ` (No: ${letter.nomorSurat})` : ''
      } — _Klik link untuk Baca Isi Surat_\n`
    : '';

  return (
    `📢 *PENGUMUMAN PANITIA${numLabel}: ${snippet}*\n` +
    `_${text.trim()}_\n` +
    letterInfo +
    `\n🔗 *Buka Pengumuman & Baca Isi Surat:*\n${url}`
  );
}

/**
 * Renders a WhatsApp-style preview card on an HTML5 Canvas with the Kemenag Crest at the top
 * and the exact Announcement Redaksi (6-word bold title + full announcement excerpt) in the green bottom panel.
 */
export async function renderAnnouncementWaCardCanvas(options: {
  text: string;
  index?: number;
  letter?: AnnouncementLetter | null;
  logoUrl?: string;
}): Promise<HTMLCanvasElement> {
  const { text, index, letter, logoUrl = '/Kementerian-Agama.png' } = options;
  const canvas = document.createElement('canvas');
  const W = 720;
  const H = 820;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Top White Area for Kemenag Emblem (matches WhatsApp preview layout)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, 500);

  // Load Kemenag Logo
  await new Promise<void>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const size = 430;
      ctx.drawImage(img, (W - size) / 2, (500 - size) / 2, size, size);
      resolve();
    };
    img.onerror = () => resolve();
    img.src = logoUrl;
  });

  // Bottom Dark Emerald Box with the actual Announcement Redaksi
  ctx.fillStyle = '#06372a';
  ctx.fillRect(0, 500, W, H - 500);

  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(0, 500, W, 6);

  // Badge line
  ctx.fillStyle = '#fde68a';
  ctx.font = '700 18px "Plus Jakarta Sans", sans-serif';
  const badgeText =
    index !== undefined
      ? `PENGUMUMAN PANITIA HAB KE-81 #${index + 1}${letter ? ' • LAMPIRAN SURAT RESMI' : ''}`
      : 'PENGUMUMAN RESMI PANITIA HAB KE-81 KEMENAG TOJO UNA-UNA';
  ctx.fillText(badgeText, 32, 542);

  // Bold 6-word Redaksi Title (2 lines max)
  const snippetTitle = getAnnouncementSnippetWords(text, 7);
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 28px "Plus Jakarta Sans", sans-serif';

  const wrapLines = (str: string, maxWidth: number, maxLines: number): string[] => {
    const words = str.split(/\s+/);
    const lines: string[] = [];
    let current = '';
    for (const w of words) {
      const test = current ? `${current} ${w}` : w;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = w;
        if (lines.length >= maxLines - 1) break;
      } else {
        current = test;
      }
    }
    if (current && lines.length < maxLines) {
      lines.push(current);
    }
    return lines;
  };

  const titleLines = wrapLines(snippetTitle, W - 64, 2);
  let y = 582;
  for (const line of titleLines) {
    ctx.fillText(line, 32, y);
    y += 34;
  }

  // Full Redaksi Description below title
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '500 21px "Plus Jakarta Sans", sans-serif';
  const descLines = wrapLines(text.trim(), W - 64, 4);
  y += 6;
  for (const line of descLines) {
    ctx.fillText(line, 32, y);
    y += 29;
  }

  // Domain footer
  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 17px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('irfan45372.github.io • Humas Kemenag Kab. Tojo Una-Una', 32, H - 24);

  return canvas;
}

/**
 * Generates and downloads an official Kemenag Tojo Una-Una Word (.doc) letter document
 * when the user clicks "Unduh Surat" on an announcement whose letter is text-based.
 */
export function downloadGeneratedOfficialLetterDoc(options: {
  announcementText: string;
  index: number;
  letter?: AnnouncementLetter | null;
  pejabatNama?: string;
  pejabatNip?: string;
}): void {
  const { announcementText, index, letter, pejabatNama, pejabatNip } = options;
  const nomor = letter?.nomorSurat || `B-0${index + 1}/Kk.22.09/PAN-HAB81/11/2026`;
  const perihal =
    letter?.perihalSurat || getAnnouncementSnippetWords(announcementText, 6);
  const isi = letter?.isiSuratTeks || announcementText;
  const slug = getAnnouncementUrlSlug(perihal, 5);

  const htmlDoc = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${perihal}</title>
<style>
  body { font-family: "Times New Roman", serif; font-size: 12pt; color: #000; line-height: 1.5; margin: 2cm; }
  .kop { text-align: center; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 20px; }
  .kop h1 { font-size: 14pt; margin: 0; font-weight: bold; text-transform: uppercase; }
  .kop h2 { font-size: 13pt; margin: 2px 0; font-weight: bold; text-transform: uppercase; }
  .kop p { font-size: 10pt; margin: 2px 0; }
  .meta { margin-bottom: 20px; }
  .isi { white-space: pre-line; text-align: justify; margin-bottom: 36px; }
  .ttd { float: right; width: 260px; text-align: left; margin-top: 24px; }
</style>
</head>
<body>
  <div class="kop">
    <h1>KEMENTERIAN AGAMA REPUBLIK INDONESIA</h1>
    <h2>KANTOR KEMENTERIAN AGAMA KABUPATEN TOJO UNA-UNA</h2>
    <p>PANITIA PELAKSANA HARI AMAL BAKTI (HAB) KE-81 TAHUN 2027</p>
  </div>
  <div class="meta">
    <div><strong>Nomor</strong> : ${nomor}</div>
    <div><strong>Sifat</strong> : Penting</div>
    <div><strong>Perihal</strong> : <strong>${perihal}</strong></div>
  </div>
  <div class="isi">${isi}</div>
  <div class="ttd">
    <div>Ampana, ${letter?.waktuUpload || new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
    <div><strong>Panitia Pelaksana HAB ke-81 Tahun 2027,</strong></div>
    <br/><br/><br/>
    <div><strong><u>Kantor Kementerian Agama Kab. Tojo Una-Una</u></strong></div>
  </div>
</body>
</html>`;

  const blob = new Blob(['\ufeff', htmlDoc], {
    type: 'application/msword;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Surat-Panitia-HAB81-${slug}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}


