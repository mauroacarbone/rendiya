(function () {
  function campoOf(input) {
    return input.closest('.campo');
  }

  function clearError(input) {
    const campo = campoOf(input);
    if (!campo) return;
    campo.classList.remove('error');
    const msg = campo.querySelector('.js-error');
    if (msg) msg.remove();
  }

  function showError(input, message) {
    const campo = campoOf(input);
    if (!campo) return;
    clearError(input);
    campo.classList.add('error');
    const p = document.createElement('p');
    p.className = 'msg-error js-error';
    p.textContent = message;
    campo.appendChild(p);
  }

  function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function isImageName(name) {
    return /\.(jpe?g|png|gif)$/i.test(name || '');
  }

  function valueOf(input) {
    if (input.type === 'file') {
      return input.files && input.files[0] ? input.files[0].name : '';
    }
    return (input.value || '').trim();
  }

  function validateField(input, rules) {
    const value = valueOf(input);
    if (rules.required && !value) {
      return rules.required;
    }
    if (rules.min && value.length < rules.min) {
      return rules.minMessage;
    }
    if (rules.email && value && !isEmail(value)) {
      return rules.email;
    }
    if (rules.phone) {
      var digits = value.replace(/\D/g, '');
      if (digits.indexOf('54') === 0 && digits.length > 10) {
        digits = digits.slice(2);
      }
      if (digits.length < 10) {
        return rules.phone;
      }
    }
    if (rules.image && value && !isImageName(value)) {
      return rules.image;
    }
    if (rules.match) {
      const other = document.getElementById(rules.match);
      if (other && other.value !== input.value) {
        return rules.matchMessage;
      }
    }
    return '';
  }

  function bindForm(form, config) {
    if (!form) return;
    form.setAttribute('novalidate', 'novalidate');

    function run(input) {
      const rules = config[input.name];
      if (!rules) return true;
      const message = validateField(input, rules);
      if (message) {
        showError(input, message);
        return false;
      }
      clearError(input);
      return true;
    }

    Object.keys(config).forEach(function (name) {
      const input = form.elements[name];
      if (!input) return;
      input.addEventListener('blur', function () { run(input); });
      input.addEventListener('input', function () {
        if (campoOf(input) && campoOf(input).classList.contains('error')) {
          run(input);
        }
      });
    });

    form.addEventListener('submit', function (event) {
      let ok = true;
      Object.keys(config).forEach(function (name) {
        const input = form.elements[name];
        if (input && !run(input)) {
          ok = false;
        }
      });
      if (!ok) {
        event.preventDefault();
        const first = form.querySelector('.campo.error input, .campo.error textarea');
        if (first) first.focus();
      }
    });
  }

  window.rendiyaForms = { bindForm: bindForm };
})();
