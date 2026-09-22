(function () {
  var share = window.RendiYaShare;
  var cfg = window.RENDIYA_LIVE || {};
  var labels = cfg.labels || { pending: 'Pendiente', confirmed: 'Confirmada', cancelled: 'Cancelada' };
  var center = cfg.examCenter || (share && share.DEFAULT_CENTER);
  var page = document.querySelector('.reservations-page');

  if (share) {
    share.bindExtras(document, center);
  }

  if (!page || !cfg.apiUrl || !cfg.token || typeof io !== 'function') {
    return;
  }

  function isCancelled(status) {
    return /^(cancelled|canceled|cancelada)$/i.test(String(status || ''));
  }

  function extrasHtml(item, sede) {
    var cal = share ? share.calendarUrl(item, sede || center) : '#';
    return '<div class="reservation-extras">'
      + '<button type="button" class="btn btn-linea" data-voucher data-id="' + item.id + '" data-date="' + String(item.date).replace(/"/g, '') + '" data-slot="' + String(item.time_slot).replace(/"/g, '') + '">Descargar Voucher</button>'
      + '<a class="btn btn-linea" href="' + cal + '" target="_blank" rel="noopener">Agregar a Google Calendar</a>'
      + '</div>';
  }

  function applyLiveUpdate(payload) {
    if (!payload || payload.reservationId == null) {
      return;
    }
    var id = payload.reservationId;
    var status = String(payload.status || '');
    var row = page.querySelector('li[data-reservation-id="' + id + '"]');
    if (!row) {
      return;
    }
    if (isCancelled(status)) {
      row.remove();
      return;
    }
    var badge = row.querySelector('.badge');
    if (badge) {
      badge.className = 'badge badge-' + status;
      badge.textContent = labels[status] || status;
    }
    if (payload.venue) {
      row.setAttribute('data-venue', payload.venue.name + ', ' + payload.venue.address);
      var venueLine = row.querySelector('.reservation-venue');
      if (venueLine) {
        venueLine.textContent = payload.venue.name + ' · ' + payload.venue.address;
      }
    }
    var assignmentLine = row.querySelector('.reservation-assignment');
    if (assignmentLine && (payload.assigned_vehicle || payload.assigned_instructor)) {
      assignmentLine.hidden = false;
      assignmentLine.textContent = [payload.assigned_vehicle, payload.assigned_instructor]
        .filter(Boolean)
        .join(' · ');
    }
    if (status.toLowerCase() === 'confirmed') {
      var confirmForm = row.querySelector('form[action*="/confirm"]');
      if (confirmForm) {
        confirmForm.remove();
      }
      if (!row.querySelector('.reservation-extras')) {
        var actions = row.querySelector('.reservation-actions');
        if (actions) {
          actions.insertAdjacentHTML('beforebegin', extrasHtml({
            id: id,
            date: row.getAttribute('data-date'),
            time_slot: row.getAttribute('data-slot')
          }, payload.venue));
        }
      }
      var seenKey = 'rendiya-celebrated-' + id;
      if (sessionStorage.getItem(seenKey) !== '1') {
        sessionStorage.setItem(seenKey, '1');
        if (share) share.celebrateConfirmed();
      }
    }
    row.classList.remove('is-live');
    void row.offsetWidth;
    row.classList.add('is-live');
  }

  var socket = io(cfg.apiUrl, {
    auth: { token: cfg.token },
    transports: ['websocket', 'polling'],
    reconnection: true
  });

  socket.on('reservation_updated', applyLiveUpdate);
})();
