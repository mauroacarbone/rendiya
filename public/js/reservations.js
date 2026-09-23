(function () {
  var INTENT_KEY = 'rendiya-reservation-intent';
  var LOGIN_URL = '/users/login?redirect=/reservar';

  function loggedIn() {
    return Boolean(window.RENDIYA && window.RENDIYA.user);
  }

  function saveIntent(intent) {
    try {
      window.sessionStorage.setItem(INTENT_KEY, JSON.stringify(intent));
    } catch (error) {
      /* sessionStorage bloqueado: el login sigue, el carrito de sesión puede cubrir */
    }
  }

  function readIntent() {
    try {
      var raw = window.sessionStorage.getItem(INTENT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function clearIntent() {
    try {
      window.sessionStorage.removeItem(INTENT_KEY);
    } catch (error) {
      /* noop */
    }
  }

  function goLogin() {
    window.location.href = LOGIN_URL;
  }

  function fieldValue(root, name) {
    var field = root.querySelector('[name="' + name + '"]');
    return field ? String(field.value || '').trim() : '';
  }

  function checkboxOn(root, name) {
    var field = root.querySelector('input[name="' + name + '"][type="checkbox"]');
    return Boolean(field && field.checked);
  }

  function intentFromForm(form) {
    return {
      productId: fieldValue(form, 'id'),
      date: fieldValue(form, 'fecha') || fieldValue(form, 'date'),
      time_slot: fieldValue(form, 'franja') || fieldValue(form, 'time_slot'),
      venue: form.getAttribute('data-venue') || '',
      instructor: checkboxOn(form, 'instructor'),
      pickup: checkboxOn(form, 'pickup')
    };
  }

  function restoreIntent() {
    if (!loggedIn()) {
      goLogin();
      return;
    }
    var intent = readIntent();
    if (!intent || !intent.productId) {
      window.location.replace('/products/cart');
      return;
    }
    clearIntent();
    var params = new URLSearchParams();
    params.set('id', intent.productId);
    if (intent.date) params.set('fecha', intent.date);
    if (intent.time_slot) params.set('franja', intent.time_slot);
    if (intent.instructor) params.set('instructor', '1');
    if (intent.pickup) params.set('pickup', '1');
    window.location.replace('/products/cart?' + params.toString());
  }

  function guardStart(form) {
    form.addEventListener('submit', function (event) {
      if (loggedIn()) return;
      event.preventDefault();
      saveIntent(intentFromForm(form));
      goLogin();
    });
  }

  function guardCheckout(link) {
    link.addEventListener('click', function (event) {
      if (loggedIn()) return;
      event.preventDefault();
      var form = document.getElementById('form-cart-extras');
      saveIntent(form ? intentFromForm(form) : {});
      goLogin();
    });
  }

  function guardCheckoutForm(form) {
    form.addEventListener('submit', function (event) {
      if (loggedIn()) return;
      event.preventDefault();
      saveIntent(intentFromForm(form));
      goLogin();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (document.body.hasAttribute('data-restore-reservation')) {
      restoreIntent();
      return;
    }
    document.querySelectorAll('form[data-reserve-start]').forEach(guardStart);
    document.querySelectorAll('[data-reserve-checkout]').forEach(guardCheckout);
    var checkoutForm = document.getElementById('form-checkout');
    if (checkoutForm) guardCheckoutForm(checkoutForm);
  });
})();
