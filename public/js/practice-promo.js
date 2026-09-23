(function () {
  var dialog = document.getElementById('practice-promo');
  if (!dialog) return;

  var DISMISS_KEY = 'rendiya:practice-promo-dismissed';

  function dismissed() {
    try {
      return window.sessionStorage.getItem(DISMISS_KEY) === '1';
    } catch (error) {
      return false;
    }
  }

  function remember() {
    try {
      window.sessionStorage.setItem(DISMISS_KEY, '1');
    } catch (error) {
      /* sessionStorage bloqueado: el modal puede volver a aparecer */
    }
  }

  function close() {
    remember();
    if (dialog.open) dialog.close();
  }

  /**
   * `force` lo abre aunque ya se haya cerrado en esta sesión (fin del
   * simulador); los disparadores pasivos del directorio respetan el cierre.
   */
  function open(options) {
    var force = options && options.force;
    if (dialog.open || (!force && dismissed())) return;
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  }

  dialog.addEventListener('close', remember);
  dialog.addEventListener('click', function (event) {
    if (event.target === dialog || event.target.closest('[data-promo-close]')) {
      close();
    }
  });

  window.RendiyaPromo = { open: open, close: close };
})();
