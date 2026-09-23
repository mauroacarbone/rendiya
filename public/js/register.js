document.addEventListener('DOMContentLoaded', function () {
  rendiyaForms.bindForm(document.getElementById('form-register'), {
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
    },
    password: {
      required: 'Ingresá una contraseña.',
      min: 8,
      minMessage: 'La contraseña debe tener al menos 8 caracteres.'
    },
    passwordConfirm: {
      required: 'Repetí la contraseña.',
      match: 'password',
      matchMessage: 'Las contraseñas no coinciden.'
    },
    image: {
      image: 'La imagen debe ser JPG, JPEG, PNG o GIF.'
    }
  });
});
