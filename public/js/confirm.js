(function () {
  const theme = {
    background: '#151b2b',
    color: '#f4f7ff',
    confirmButtonColor: '#8b5cf6',
    cancelButtonColor: '#334155',
    iconColor: '#22d3ee'
  };

  async function ask(el) {
    if (!window.Swal) {
      return window.confirm(el.getAttribute('data-confirm') || 'Confirmás?');
    }

    const result = await window.Swal.fire({
      icon: el.getAttribute('data-icon') || 'warning',
      title: el.getAttribute('data-confirm') || 'Confirmás?',
      text: el.getAttribute('data-confirm-text') || '',
      showCancelButton: true,
      reverseButtons: true,
      focusCancel: true,
      confirmButtonText: el.getAttribute('data-confirm-yes') || 'Sí',
      cancelButtonText: el.getAttribute('data-confirm-no') || 'No',
      ...theme
    });

    return result.isConfirmed;
  }

  document.addEventListener('submit', function (event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.hasAttribute('data-confirm')) return;
    if (form.getAttribute('data-confirmed') === '1') return;

    event.preventDefault();
    ask(form).then(function (ok) {
      if (!ok) return;
      form.setAttribute('data-confirmed', '1');
      if (typeof form.requestSubmit === 'function') {
        form.requestSubmit();
      } else {
        HTMLFormElement.prototype.submit.call(form);
      }
    });
  });

  document.addEventListener('click', function (event) {
    const link = event.target.closest && event.target.closest('a[data-confirm]');
    if (!link) return;

    event.preventDefault();
    ask(link).then(function (ok) {
      if (ok) window.location.href = link.href;
    });
  });

  function showFlash() {
    const flash = document.getElementById('flash-notice');
    if (!flash) return;
    if (!window.Swal) {
      window.setTimeout(showFlash, 50);
      return;
    }
    flash.hidden = true;
    window.Swal.fire({
      icon: flash.getAttribute('data-icon') || 'success',
      title: flash.getAttribute('data-title') || flash.textContent,
      text: flash.getAttribute('data-text') || '',
      confirmButtonText: 'Listo',
      ...theme
    });
  }

  showFlash();
})();
