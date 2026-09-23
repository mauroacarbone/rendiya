document.addEventListener('DOMContentLoaded', function () {
  if (!window.rendiyaForms) return;
  rendiyaForms.bindForm(document.getElementById('form-profile'), {
    firstName: {
      required: 'Ingresá tu nombre.',
      min: 2,
      minMessage: 'El nombre debe tener al menos 2 caracteres.'
    },
    lastName: {
      required: 'Ingresá tu apellido.',
      min: 2,
      minMessage: 'El apellido debe tener al menos 2 caracteres.'
    },
    email: {
      required: 'Ingresá un email.',
      email: 'El email no es válido.'
    },
    phone: {
      required: 'Ingresá tu teléfono / WhatsApp.',
      phone: 'Incluí el código de área. Ej: 11 1234-5678.'
    }
  });
});
