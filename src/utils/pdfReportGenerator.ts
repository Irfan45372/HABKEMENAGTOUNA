import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  BrandingConfig,
  JalanSehatCoupon,
  ParticipantRegistration,
} from '../types/hab';
import {
  ensureWhiteRibbonKemenagCanvas,
  loadAnonymousImage,
} from '../components/DynamicLogoBadge';

async function loadKemenagLogoDataUrl(branding?: BrandingConfig): Promise<string | null> {
  try {
    const img = await loadAnonymousImage(
      '/Kementerian-Agama.png',
      branding?.kemenagLogoPrimaryUrl || branding?.kemenagLogoFallbackUrl
    );
    if (!img) return null;
    const canvas = ensureWhiteRibbonKemenagCanvas(img);
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

function formatWitaPrintTimestamp(): string {
  const now = new Date();
  return (
    now.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }) +
    ' Pukul ' +
    now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    }) +
    ' WITA'
  );
}

function drawOfficialLetterhead(
  doc: jsPDF,
  logoDataUrl: string | null,
  reportTitle: string,
  reportSubtitle: string
): number {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Official Kemenag Logo on left of Kop Surat
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', 16, 10, 22, 22);
    } catch {
      // Ignore logo embed error
    }
  }

  // Official Kop Surat Lines
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(6, 78, 59); // Deep Emerald
  doc.text('KEMENTERIAN AGAMA REPUBLIK INDONESIA', pageWidth / 2, 15, {
    align: 'center',
  });

  doc.setFontSize(11.5);
  doc.setTextColor(15, 23, 42);
  doc.text('KANTOR KEMENTERIAN AGAMA KABUPATEN TOJO UNA-UNA', pageWidth / 2, 21, {
    align: 'center',
  });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 83, 9); // Gold/Amber accent
  doc.text(
    'PANITIA PERINGATAN HARI AMAL BAKTI (HAB) KE-81 TAHUN 2027',
    pageWidth / 2,
    26.5,
    { align: 'center' }
  );

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(
    'by HUMAS KEMENTERIAN AGAMA KABUPATEN TOJO UNA UNA · Ampana, Sulawesi Tengah',
    pageWidth / 2,
    31.5,
    { align: 'center' }
  );

  // Double horizontal line under Kop Surat
  doc.setDrawColor(6, 78, 59);
  doc.setLineWidth(0.8);
  doc.line(14, 35, pageWidth - 14, 35);
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.3);
  doc.line(14, 36.2, pageWidth - 14, 36.2);

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(15, 23, 42);
  doc.text(reportTitle, pageWidth / 2, 43, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(reportSubtitle, pageWidth / 2, 48, { align: 'center' });

  return 53;
}

function drawSignatureFooter(doc: jsPDF, startY: number): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = startY + 10;

  if (y + 38 > pageHeight - 12) {
    doc.addPage();
    y = 24;
  }

  const dateStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);

  // Left signature block
  const leftX = 35;
  doc.text('Mengetahui,', leftX, y);
  doc.setFont('helvetica', 'bold');
  doc.text('Ketua Panitia HAB ke-81 Kemenag Touna', leftX, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.text('( ...................................................... )', leftX, y + 26);
  doc.setFontSize(8.5);
  doc.text('NIP. .................................................', leftX, y + 31);

  // Right signature block
  const rightX = pageWidth - 95;
  doc.setFontSize(9.5);
  doc.text(`Ampana, ${dateStr}`, rightX, y);
  doc.setFont('helvetica', 'bold');
  doc.text('Humas / Sekretariat Panitia HAB ke-81', rightX, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.text('( ...................................................... )', rightX, y + 26);
  doc.setFontSize(8.5);
  doc.text('NIP. .................................................', rightX, y + 31);
}

/**
 * Generates and downloads an official A4 Landscape PDF report of Competition Participants.
 */
export async function downloadRegistrationsPdfReport(
  registrations: ParticipantRegistration[],
  branding?: BrandingConfig,
  filterLabel: string = 'Semua Cabang Lomba'
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const logoDataUrl = await loadKemenagLogoDataUrl(branding);
  const printTime = formatWitaPrintTimestamp();

  const startY = drawOfficialLetterhead(
    doc,
    logoDataUrl,
    'LAPORAN RESMI DAFTAR PESERTA LOMBA & PORSENI HAB KE-81',
    `Filter Cabang Lomba: ${filterLabel}  |  Total Terdaftar: ${registrations.length} Peserta/Tim  |  Dicetak: ${printTime}`
  );

  const tableRows = registrations.map((reg, idx) => [
    String(idx + 1),
    reg.competitionName || '-',
    reg.jenisPeserta || '-',
    reg.satker || '-',
    reg.namaTimAtauPeserta || '-',
    Array.isArray(reg.daftarPemain) ? reg.daftarPemain.join(', ') : '-',
    reg.kontakWhatsapp || '-',
    reg.waktuDaftar || '-',
  ]);

  autoTable(doc, {
    startY,
    head: [
      [
        'No',
        'Cabang Lomba',
        'Format',
        'Kontingen / Satker',
        'Nama Peserta / Tim',
        'Daftar Anggota / Pemain',
        'No. WhatsApp',
        'Waktu Daftar',
      ],
    ],
    body:
      tableRows.length > 0
        ? tableRows
        : [['-', 'Belum ada data pendaftar pada filter ini', '-', '-', '-', '-', '-', '-']],
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 2.5,
      textColor: [15, 23, 42],
      lineColor: [148, 163, 184],
      lineWidth: 0.2,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [6, 78, 59], // Kemenag Emerald
      textColor: [254, 240, 138], // Gold text
      fontStyle: 'bold',
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [240, 253, 244],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 36, fontStyle: 'bold' },
      2: { cellWidth: 26, halign: 'center' },
      3: { cellWidth: 46 },
      4: { cellWidth: 42, fontStyle: 'bold' },
      5: { cellWidth: 56 },
      6: { cellWidth: 28, halign: 'center' },
      7: { cellWidth: 25, halign: 'center' },
    },
    margin: { left: 14, right: 14 },
  });

  const finalY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || startY + 20;
  drawSignatureFooter(doc, finalY);

  const safeSlug = filterLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  doc.save(`Laporan-Peserta-Lomba-HAB81-${safeSlug || 'semua'}.pdf`);
}

/**
 * Generates and downloads an official A4 Landscape PDF report of Jalan Sehat Coupons
 * (either Winners Only for doorprize handover report, or All Registered Coupons).
 */
export async function downloadJalanSehatPdfReport(
  coupons: JalanSehatCoupon[],
  branding?: BrandingConfig,
  mode: 'winners_only' | 'all_coupons' = 'winners_only'
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const logoDataUrl = await loadKemenagLogoDataUrl(branding);
  const printTime = formatWitaPrintTimestamp();

  const filteredCoupons =
    mode === 'winners_only' ? coupons.filter((c) => c.sudahMenang) : coupons;

  const title =
    mode === 'winners_only'
      ? 'LAPORAN RESMI PEMENANG UNDIAN DOORPRIZE JALAN SEHAT KERUKUNAN HAB KE-81'
      : 'LAPORAN RESMI DAFTAR PESERTA & KUPON JALAN SEHAT KERUKUNAN HAB KE-81';

  const subtitle =
    mode === 'winners_only'
      ? `Total Pemenang Doorprize: ${filteredCoupons.length} Orang  |  Total Kupon Terdaftar: ${coupons.length} Kupon  |  Dicetak: ${printTime}`
      : `Total Peserta Kupon Jalan Sehat: ${filteredCoupons.length} Kupon  |  Pemenang Undian: ${coupons.filter((c) => c.sudahMenang).length} Orang  |  Dicetak: ${printTime}`;

  const startY = drawOfficialLetterhead(doc, logoDataUrl, title, subtitle);

  if (mode === 'winners_only') {
    const rows = filteredCoupons.map((c, idx) => [
      String(idx + 1),
      c.nomorKupon || '-',
      c.namaPeserta || '-',
      c.satkerAtauUmum || '-',
      c.nikAtauNip || '-',
      c.noHp || '-',
      c.hadiahDimenangkan || 'Doorprize HAB ke-81',
      '', // Blank column for physical signature on prize handover
    ]);

    autoTable(doc, {
      startY,
      head: [
        [
          'No',
          'Nomor Kupon',
          'Nama Pemenang',
          'Utusan Satker / Umum',
          'NIK / NIP',
          'No. HP / WA',
          'Hadiah Doorprize Dimenangkan',
          'Tanda Tangan Penerima',
        ],
      ],
      body:
        rows.length > 0
          ? rows
          : [
              [
                '-',
                '-',
                'Belum ada pemenang kupon yang diundi',
                '-',
                '-',
                '-',
                '-',
                '-',
              ],
            ],
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 8.5,
        cellPadding: 3,
        textColor: [15, 23, 42],
        lineColor: [148, 163, 184],
        lineWidth: 0.2,
        valign: 'middle',
      },
      headStyles: {
        fillColor: [6, 78, 59],
        textColor: [254, 240, 138],
        fontStyle: 'bold',
        halign: 'center',
      },
      alternateRowStyles: {
        fillColor: [254, 252, 232],
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 32, halign: 'center', fontStyle: 'bold' },
        2: { cellWidth: 44, fontStyle: 'bold' },
        3: { cellWidth: 48 },
        4: { cellWidth: 32, halign: 'center' },
        5: { cellWidth: 28, halign: 'center' },
        6: { cellWidth: 44, fontStyle: 'bold' },
        7: { cellWidth: 31, halign: 'center' },
      },
      margin: { left: 14, right: 14 },
    });
  } else {
    const rows = filteredCoupons.map((c, idx) => [
      String(idx + 1),
      c.nomorKupon || '-',
      c.namaPeserta || '-',
      c.satkerAtauUmum || '-',
      c.nikAtauNip || '-',
      c.noHp || '-',
      c.waktuRegistrasi || '-',
      c.sudahMenang
        ? `MENANG (${c.hadiahDimenangkan || 'Doorprize'})`
        : 'Peserta Aktif',
    ]);

    autoTable(doc, {
      startY,
      head: [
        [
          'No',
          'Nomor Kupon',
          'Nama Peserta',
          'Utusan Satker / Umum',
          'NIK / NIP',
          'No. HP / WA',
          'Waktu Cetak',
          'Status Undian / Doorprize',
        ],
      ],
      body:
        rows.length > 0
          ? rows
          : [['-', '-', 'Belum ada peserta kupon terdaftar', '-', '-', '-', '-', '-']],
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 8.5,
        cellPadding: 2.5,
        textColor: [15, 23, 42],
        lineColor: [148, 163, 184],
        lineWidth: 0.2,
        valign: 'middle',
      },
      headStyles: {
        fillColor: [6, 78, 59],
        textColor: [254, 240, 138],
        fontStyle: 'bold',
        halign: 'center',
      },
      alternateRowStyles: {
        fillColor: [240, 253, 244],
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 32, halign: 'center', fontStyle: 'bold' },
        2: { cellWidth: 46, fontStyle: 'bold' },
        3: { cellWidth: 50 },
        4: { cellWidth: 32, halign: 'center' },
        5: { cellWidth: 28, halign: 'center' },
        6: { cellWidth: 28, halign: 'center' },
        7: { cellWidth: 43, halign: 'center' },
      },
      margin: { left: 14, right: 14 },
    });
  }

  const finalY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || startY + 20;
  drawSignatureFooter(doc, finalY);

  const fileName =
    mode === 'winners_only'
      ? 'Laporan-Pemenang-Doorprize-Jalan-Sehat-HAB81-Kemenag-Touna.pdf'
      : 'Laporan-Semua-Kupon-Jalan-Sehat-HAB81-Kemenag-Touna.pdf';
  doc.save(fileName);
}
