(function () {
  function bind(form) {
    const instructor = form.querySelector('[data-instructor-toggle]');
    const pickup = form.querySelector('input[name="pickup"][type="checkbox"]');
    const fields = form.querySelector('.pickup-fields');
    if (!instructor || !pickup) return;

    pickup.disabled = false;

    function syncFromInstructor() {
      if (!instructor.checked) {
        pickup.checked = false;
      }
      if (fields) fields.hidden = !pickup.checked;
    }

    function syncFromPickup() {
      if (pickup.checked) {
        instructor.checked = true;
      }
      if (fields) fields.hidden = !pickup.checked;
      if (form.id === 'form-cart-extras') {
        form.submit();
      }
    }

    instructor.addEventListener('change', syncFromInstructor);
    pickup.addEventListener('change', syncFromPickup);
    if (pickup.checked) instructor.checked = true;
    if (fields) fields.hidden = !pickup.checked;
  }

  document.querySelectorAll('form').forEach(bind);
})();
