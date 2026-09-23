document.addEventListener('DOMContentLoaded', function () {
  rendiyaForms.bindForm(document.getElementById('form-autoescuela'), {
    schoolName: {
      required: 'Ingresá el nombre de la autoescuela.',
      min: 3,
      minMessage: 'El nombre debe tener al menos 3 caracteres.'
    },
    contactName: {
      required: 'Ingresá el nombre de contacto.',
      min: 2,
      minMessage: 'El nombre debe tener al menos 2 caracteres.'
    },
    email: {
      required: 'Ingresá un email.',
      email: 'El email no es válido.'
    },
    phone: {
      required: 'Ingresá el teléfono / WhatsApp.',
      phone: 'Incluí el código de área. Ej: 11 1234-5678.'
    },
    zone: {
      required: 'Elegí la zona.'
    },
    neighborhood: {
      required: 'Ingresá el barrio o localidad.'
    }
  });

  if (!window.RendiyaPromo) return;

  // Al volver de WhatsApp (la pestaña recupera el foco) ya terminó la consulta.
  var contacted = false;
  document.querySelectorAll('[data-promo-after-contact]').forEach(function (link) {
    link.addEventListener('click', function () { contacted = true; });
  });
  document.addEventListener('visibilitychange', function () {
    if (contacted && document.visibilityState === 'visible') {
      contacted = false;
      window.setTimeout(function () { window.RendiyaPromo.open(); }, 600);
    }
  });

  // Llegar al final del listado cuenta como fin de la navegación.
  var sentinel = document.querySelector('[data-promo-sentinel]');
  if (sentinel && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      if (entries.some(function (entry) { return entry.isIntersecting; })) {
        observer.disconnect();
        window.RendiyaPromo.open();
      }
    });
    window.addEventListener('scroll', function () {
      observer.observe(sentinel);
    }, { once: true, passive: true });
  }
});
