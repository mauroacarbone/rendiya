(function () {
  var form = document.getElementById('form-gateway');
  if (!form) return;

  function payPanel(method) {
    ['card', 'mercadopago', 'transfer'].forEach(function (name) {
      var panel = document.getElementById('pay-' + name);
      if (panel) panel.hidden = name !== method;
    });
  }

  form.querySelectorAll('input[name="payment_method"]').forEach(function (input) {
    input.addEventListener('change', function () {
      payPanel(input.value);
    });
  });

  var numberInput = document.getElementById('card_number');
  var preview = document.getElementById('card-preview');
  if (numberInput) {
    numberInput.addEventListener('input', function () {
      var digits = numberInput.value.replace(/\D/g, '').slice(0, 16);
      var groups = digits.match(/.{1,4}/g) || [];
      numberInput.value = groups.join(' ');
      if (preview) {
        preview.textContent = groups.join(' ') || '•••• •••• •••• ••••';
      }
    });
  }

  var expiry = document.getElementById('card_expiry');
  if (expiry) {
    expiry.addEventListener('input', function () {
      var digits = expiry.value.replace(/\D/g, '').slice(0, 4);
      expiry.value = digits.length > 2 ? digits.slice(0, 2) + '/' + digits.slice(2) : digits;
    });
  }

  form.addEventListener('submit', function (event) {
    if (form.getAttribute('data-confirmed') === '1') return;
    event.preventDefault();

    var method = form.querySelector('input[name="payment_method"]:checked');
    if (!method) return;

    if (method.value === 'card') {
      var holder = String((form.card_holder && form.card_holder.value) || '').trim();
      var number = String((form.card_number && form.card_number.value) || '').replace(/\s+/g, '');
      if (holder.length < 3 || number.length < 13) {
        if (window.Swal) {
          window.Swal.fire({
            icon: 'warning',
            title: 'Completá la tarjeta',
            text: 'Titular y número son obligatorios en la pasarela.',
            background: '#151b2b',
            color: '#f4f7ff',
            confirmButtonColor: '#8b5cf6'
          });
        }
        return;
      }
    }

    var overlay = document.getElementById('gateway-overlay');
    if (overlay) overlay.hidden = false;
    var btn = document.getElementById('btn-gateway-pay');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Procesando…';
    }

    window.setTimeout(function () {
      form.setAttribute('data-confirmed', '1');
      form.submit();
    }, 1400);
  });
})();
