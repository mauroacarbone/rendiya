(function (root) {
  var DEFAULT_CENTER = {
    name: 'Centro de Evaluación de Conductores CABA (Parque Roca)',
    address: 'Av. Cruz y Av. Escalada, Villa Soldati, CABA'
  };

  function digits(slot) {
    return String(slot || '').match(/(\d{1,2}):(\d{2})/g) || [];
  }

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function compactDate(isoDate, hhmm) {
    var day = String(isoDate || '').replace(/-/g, '');
    var parts = String(hhmm || '08:00').split(':');
    return day + 'T' + pad(parts[0] || '08') + pad(parts[1] || '00') + '00';
  }

  function parseSlot(slot) {
    var times = digits(slot);
    var start = times[0] || '08:00';
    var end = times[1] || '11:00';
    return { start: start, end: end };
  }

  function calendarUrl(item, center) {
    var sede = center || DEFAULT_CENTER;
    var slot = parseSlot(item.time_slot);
    var dates = compactDate(item.date, slot.start) + '/' + compactDate(item.date, slot.end);
    var params = new URLSearchParams({
      action: 'TEMPLATE',
      text: 'Examen práctico — RendiYa',
      dates: dates,
      details: 'Turno RendiYa #' + item.id + ' · ' + (item.time_slot || '') + '. Llevá DNI y el voucher.',
      location: sede.name + ', ' + sede.address,
      ctz: 'America/Argentina/Buenos_Aires'
    });
    return 'https://calendar.google.com/calendar/render?' + params.toString();
  }

  function showToast(message) {
    var el = document.getElementById('rendiya-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'rendiya-toast';
      el.className = 'rendiya-toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.hidden = false;
    el.classList.add('is-on');
    window.clearTimeout(showToast._timer);
    showToast._timer = window.setTimeout(function () {
      el.classList.remove('is-on');
    }, 4500);
  }

  function celebrateConfirmed() {
    showToast('¡Pago Aprobado! Tu turno para el examen fue confirmado');
    if (typeof window.confetti === 'function') {
      window.confetti({
        particleCount: 110,
        spread: 76,
        startVelocity: 38,
        origin: { y: 0.72 },
        colors: ['#8b5cf6', '#22d3ee', '#3b82f6', '#f4f7ff', '#34d399']
      });
    }
  }

  function downloadVoucher(item, center) {
    var sede = center || DEFAULT_CENTER;
    var JsPDF = window.jspdf && window.jspdf.jsPDF;
    if (!JsPDF || !window.QRCode) {
      window.alert('No se pudo generar el PDF. Recargá la página e intentá de nuevo.');
      return;
    }
    var payload = 'RendiYa voucher #' + item.id + ' | ' + item.date + ' | ' + item.time_slot;
    window.QRCode.toDataURL(payload, { margin: 1, width: 220, color: { dark: '#0b0f19', light: '#ffffff' } }, function (error, qr) {
      if (error) {
        window.alert('No se pudo armar el código QR.');
        return;
      }
      var doc = new JsPDF({ unit: 'mm', format: 'a4' });
      doc.setFillColor(11, 15, 25);
      doc.rect(0, 0, 210, 297, 'F');
      doc.setFillColor(109, 40, 217);
      doc.rect(0, 0, 210, 28, 'F');
      doc.setTextColor(244, 247, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('RendiYa', 16, 18);
      doc.setTextColor(34, 211, 238);
      doc.text('Voucher', 52, 18);
      doc.setTextColor(244, 247, 255);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Comprobante de reserva para el examen práctico', 16, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Turno #' + item.id, 16, 58);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.text('Fecha: ' + item.date, 16, 72);
      doc.text('Franja: ' + item.time_slot, 16, 80);
      doc.text('Sede: ' + sede.name, 16, 88);
      doc.text(sede.address, 16, 96);
      doc.text('Estado: Confirmada', 16, 108);
      if (item.addons) {
        doc.text('Extras: ' + item.addons, 16, 116, { maxWidth: 120 });
      }
      if (item.assignment) {
        doc.text('Asignado: ' + item.assignment, 16, item.addons ? 124 : 116, { maxWidth: 120 });
      }
      if (qr) {
        doc.addImage(qr, 'PNG', 150, 36, 42, 42);
      }
      doc.setFontSize(10);
      doc.setTextColor(168, 180, 212);
      doc.text('Presentá este voucher y tu DNI el día del práctico. No reemplaza el trámite en la sede.', 16, 128, { maxWidth: 178 });
      doc.save('rendiya-voucher-' + item.id + '.pdf');
    });
  }

  // "Nombre de la sede, dirección" tal como lo deja la vista en data-venue.
  function venueFromRow(row) {
    var raw = row && row.getAttribute('data-venue');
    if (!raw) return null;
    var comma = raw.indexOf(',');
    return comma === -1
      ? { name: raw, address: '' }
      : { name: raw.slice(0, comma).trim(), address: raw.slice(comma + 1).trim() };
  }

  function textOf(row, selector) {
    var node = row && row.querySelector(selector);
    return node && !node.hidden ? node.textContent.trim() : '';
  }

  function bindExtras(scope, center) {
    var host = scope || document;
    host.addEventListener('click', function (event) {
      var btn = event.target.closest && event.target.closest('[data-voucher]');
      if (!btn) return;
      event.preventDefault();
      var row = btn.closest('li[data-reservation-id]');
      downloadVoucher({
        id: btn.getAttribute('data-id'),
        date: btn.getAttribute('data-date'),
        time_slot: btn.getAttribute('data-slot'),
        addons: textOf(row, '.reservation-addons').replace(/^Extras:\s*/, ''),
        assignment: textOf(row, '.reservation-assignment')
      }, venueFromRow(row) || center);
    });
  }

  root.RendiYaShare = {
    DEFAULT_CENTER: DEFAULT_CENTER,
    parseSlot: parseSlot,
    calendarUrl: calendarUrl,
    downloadVoucher: downloadVoucher,
    celebrateConfirmed: celebrateConfirmed,
    showToast: showToast,
    bindExtras: bindExtras
  };
})(window);
