(function () {
  var cfg = window.RENDIYA_LIVE;
  if (!cfg || !cfg.apiUrl || !cfg.token || typeof io !== 'function') {
    return;
  }

  var labels = cfg.labels || { pending: 'Pendiente', confirmed: 'Confirmada', cancelled: 'Cancelada' };
  var page = document.querySelector('.reservations-page');
  if (!page) {
    return;
  }

  function isCancelled(status) {
    return /^(cancelled|canceled|cancelada)$/i.test(String(status || ''));
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
    if (status.toLowerCase() === 'confirmed') {
      var confirmForm = row.querySelector('form[action*="/confirm"]');
      if (confirmForm) {
        confirmForm.remove();
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
