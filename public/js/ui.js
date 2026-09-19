(function () {
  const form = document.getElementById('form-checkout');
  if (!form) return;

  form.addEventListener('submit', function () {
    const button = form.querySelector('button[type="submit"]');
    if (!button || !form.checkValidity()) return;
    button.disabled = true;
    button.textContent = 'Confirmando…';
  });
})();
