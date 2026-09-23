(function () {
  function localDigits(value) {
    var digits = String(value || '').replace(/\D/g, '');
    if (digits.indexOf('00') === 0) {
      digits = digits.slice(2);
    }
    if (digits.indexOf('54') === 0 && digits.length > 10) {
      digits = digits.slice(2);
    }
    return digits.replace(/^0+/, '');
  }

  function formatLocal(value) {
    var digits = localDigits(value);
    if (!digits) return '';
    if (digits.indexOf('11') === 0) {
      var rest = digits.slice(2);
      if (!rest) return '11';
      if (rest.length <= 4) return '11 ' + rest;
      return '11 ' + rest.slice(0, 4) + '-' + rest.slice(4, 8);
    }
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return digits.slice(0, 3) + ' ' + digits.slice(3);
    return digits.slice(0, 3) + ' ' + digits.slice(3, 6) + '-' + digits.slice(6, 10);
  }

  function bind(input) {
    if (!input) return;
    input.addEventListener('blur', function () {
      var formatted = formatLocal(input.value);
      if (formatted) input.value = formatted;
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    bind(document.getElementById('phone'));
    bind(document.getElementById('contact_phone'));
  });
})();
