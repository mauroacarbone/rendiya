const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

const COLORS = {
  bg: '#0b0f19',
  band: '#6d28d9',
  text: '#f4f7ff',
  cyan: '#22d3ee',
  muted: '#a8b4d4'
};

function addonsText(addons) {
  if (!Array.isArray(addons)) return addons ? String(addons) : '';
  return addons.map((addon) => (addon && addon.label) || addon).filter(Boolean).join(' · ');
}

function assignmentText(reservation) {
  return [reservation.assigned_vehicle, reservation.assigned_instructor].filter(Boolean).join(' · ');
}

/**
 * Arma el voucher completo en memoria: si algo falla, falla antes de mandar
 * cabeceras y el controlador todavía puede responder un error JSON.
 */
async function buildVoucherPdf(reservation, venue) {
  const payload = `RendiYa voucher #${reservation.id} | ${reservation.date} | ${reservation.time_slot}`;
  const qr = await QRCode.toBuffer(payload, {
    margin: 1,
    width: 220,
    color: { dark: COLORS.bg, light: '#ffffff' }
  });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0, info: { Title: `Voucher RendiYa #${reservation.id}` } });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const width = doc.page.width;
    doc.rect(0, 0, width, doc.page.height).fill(COLORS.bg);
    doc.rect(0, 0, width, 80).fill(COLORS.band);

    doc.font('Helvetica-Bold').fontSize(26)
      .fillColor(COLORS.text).text('Rendi', 45, 28, { continued: true })
      .fillColor(COLORS.cyan).text('Ya', { continued: true })
      .fillColor(COLORS.text).text('  Voucher');

    doc.font('Helvetica').fontSize(13).fillColor(COLORS.text)
      .text('Comprobante de reserva para el examen práctico', 45, 115);

    doc.font('Helvetica-Bold').fontSize(16).text(`Turno #${reservation.id}`, 45, 155);

    const lines = [
      `Fecha: ${reservation.date}`,
      `Franja: ${reservation.time_slot}`,
      venue && venue.name ? `Sede: ${venue.name}` : null,
      venue && venue.address ? venue.address : null,
      'Estado: Confirmada',
      addonsText(reservation.addons) ? `Extras: ${addonsText(reservation.addons)}` : null,
      assignmentText(reservation) ? `Asignado: ${assignmentText(reservation)}` : null
    ].filter(Boolean);

    doc.font('Helvetica').fontSize(12).fillColor(COLORS.text);
    let y = 190;
    lines.forEach((line) => {
      doc.text(line, 45, y, { width: 330 });
      y = doc.y + 8;
    });

    doc.image(qr, width - 45 - 125, 105, { width: 125 });

    doc.fontSize(10).fillColor(COLORS.muted).text(
      'Presentá este voucher y tu DNI el día del práctico. No reemplaza el trámite en la sede.',
      45,
      y + 20,
      { width: width - 90 }
    );

    doc.end();
  });
}

module.exports = { buildVoucherPdf };
