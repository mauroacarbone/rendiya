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

  var http = root.http || root.RendiYaHttp;
  var showToast = http.toast;

  function readError(response) {
    var type = (response.headers.get('content-type') || '').toLowerCase();
    if (type.indexOf('text/html') !== -1) {
      return Promise.resolve('No se pudo descargar el voucher. El servidor devolvió una página web.');
    }
    if (type.indexOf('application/json') !== -1) {
      return response.json().then(function (body) {
        var message = body && (body.error || body.message);
        if (typeof message === 'string' && message && message.indexOf('<') === -1) {
          return message;
        }
        return 'No se pudo descargar el voucher (' + response.status + ').';
      }).catch(function () {
        return 'No se pudo descargar el voucher (' + response.status + ').';
      });
    }
    return Promise.resolve('No se pudo descargar el voucher (' + response.status + ').');
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

  async function downloadVoucher(reservationId, btn) {
    var label = btn ? btn.textContent : '';
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Generando…';
    }
    try {
      var response = await http.safeFetch('/users/reservations/' + encodeURIComponent(reservationId) + '/voucher', {
        headers: { Accept: 'application/pdf' }
      });
      if (!response.ok) {
        throw new Error(await readError(response));
      }
      var blob = await response.blob();
      if (blob.type && blob.type.indexOf('text/html') !== -1) {
        throw new Error('No se pudo descargar el voucher. El servidor devolvió una página web.');
      }
      var url = window.URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'voucher-reserva-' + reservationId + '.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(function () { window.URL.revokeObjectURL(url); }, 1000);
    } catch (error) {
      console.error('[voucher] La descarga falló', { reservationId: reservationId, error: error });
      http.handleError(error, 'No se pudo descargar el voucher. Intentá de nuevo.');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = label;
      }
    }
  }

  function bindExtras(scope) {
    var host = scope || document;
    host.addEventListener('click', function (event) {
      var btn = event.target.closest && event.target.closest('[data-voucher]');
      if (!btn || btn.disabled) return;
      event.preventDefault();
      downloadVoucher(btn.getAttribute('data-id'), btn);
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
