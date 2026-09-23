(function () {
  const cfg = window.RENDIYA_CHECKOUT;
  const form = document.getElementById('form-checkout');
  if (!form || !cfg) return;

  const pickupToggle = document.getElementById('pickup-toggle');
  const pickupValue = document.getElementById('pickup-value');
  const wrap = document.getElementById('pickup-map-wrap');
  const status = document.getElementById('route-status');
  const latInput = document.getElementById('origin_lat');
  const lngInput = document.getElementById('origin_lng');
  const addressInput = document.getElementById('origin_address');
  const searchInput = document.getElementById('origin_search');
  const frame = document.getElementById('gmaps-frame');
  const money = new Intl.NumberFormat('es-AR');

  function moneyFmt(value) {
    return '$' + money.format(Math.round(Number(value) || 0));
  }

  function syncPickup() {
    const on = pickupToggle.checked;
    pickupValue.value = on ? '1' : '0';
    wrap.hidden = !on;
    const instructorInput = form.querySelector('input[name="instructor"]');
    if (on && instructorInput) {
      instructorInput.value = '1';
      cfg.instructor = true;
    }
    if (!on) {
      latInput.value = '';
      lngInput.value = '';
      document.getElementById('tot-pickup').textContent = '$0';
      refreshTotal();
    }
  }

  function refreshTotal() {
    const vehicle = parseMoney(document.getElementById('tot-vehicle').textContent);
    const instructor = parseMoney(document.getElementById('tot-instructor').textContent);
    const pickup = parseMoney(document.getElementById('tot-pickup').textContent);
    const addons = parseMoney(document.getElementById('tot-addons').textContent);
    document.getElementById('tot-total').textContent = moneyFmt(vehicle + instructor + pickup + addons);
  }

  function parseMoney(text) {
    return Number(String(text).replace(/[^\d]/g, '')) || 0;
  }

  const dest = [cfg.examCenter.lat, cfg.examCenter.lng];
  const map = window.L.map('checkout-map').setView(dest, 12);
  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);
  const destMarker = window.L.marker(dest).addTo(map).bindPopup(cfg.examCenter.name);
  destMarker.openPopup();
  let originMarker = null;
  let pendingOrigin = null;
  const confirmBtn = document.getElementById('btn-confirm-origin');
  const confirmedBox = document.getElementById('origin-confirmed');

  function gmapsUrl(lat, lng) {
    const origin = lat + ',' + lng;
    const destination = dest[0] + ',' + dest[1];
    return 'https://www.google.com/maps?output=embed&saddr=' + encodeURIComponent(origin) + '&daddr=' + encodeURIComponent(destination);
  }

  function showPending(lat, lng, address) {
    pendingOrigin = { lat, lng, address: address || searchInput.value };
    if (originMarker) map.removeLayer(originMarker);
    originMarker = window.L.marker([lat, lng]).addTo(map);
    map.fitBounds(window.L.latLngBounds([[lat, lng], dest]), { padding: [40, 40] });
    confirmBtn.hidden = false;
    confirmedBox.hidden = true;
    status.textContent = 'Punto encontrado. Confirmá el retiro para dejarlo efectivo y calcular el taxímetro.';
  }

  async function quote(lat, lng, address) {
    status.textContent = 'Calculando ruta hasta la sede…';
    latInput.value = lat;
    lngInput.value = lng;
    addressInput.value = address || searchInput.value;
    try {
      const payload = await window.RendiYaHttp.fetchJson('/products/checkout/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat,
          lng,
          address: address || searchInput.value,
          time_slot: form.time_slot.value,
          instructor: '1'
        })
      });
      if (!payload.success) {
        throw new Error(payload.message || 'No se pudo calcular la ruta.');
      }
      document.getElementById('tot-vehicle').textContent = moneyFmt(payload.totals.vehicle);
      document.getElementById('tot-instructor').textContent = moneyFmt(payload.totals.instructorFee);
      document.getElementById('tot-pickup').textContent = moneyFmt(payload.totals.pickupFee);
      document.getElementById('tot-total').textContent = moneyFmt(payload.totals.total);
      frame.src = gmapsUrl(lat, lng);
      status.textContent = payload.km + ' km hasta ' + cfg.examCenter.name + '. Taxímetro actualizado.';
      return true;
    } catch (error) {
      if (error.kind === 'session') {
        window.RendiYaHttp.handleError(error);
        return false;
      }
      console.error('[checkout] No se pudo cotizar el retiro', error);
      frame.src = gmapsUrl(lat, lng);
      status.textContent = 'Retiro confirmado. El taxímetro se cierra al pagar.';
      return true;
    }
  }

  function confirmPending() {
    if (!pendingOrigin) return;
    const point = pendingOrigin;
    latInput.value = point.lat;
    lngInput.value = point.lng;
    addressInput.value = point.address;
    confirmBtn.hidden = true;
    confirmedBox.hidden = false;
    confirmedBox.textContent = 'Retiro confirmado: ' + point.address;
    quote(point.lat, point.lng, point.address);
  }

  map.on('click', function (event) {
    if (!pickupToggle.checked) return;
    const label = event.latlng.lat.toFixed(5) + ', ' + event.latlng.lng.toFixed(5);
    searchInput.value = label;
    showPending(event.latlng.lat, event.latlng.lng, label);
  });

  async function geocode(query) {
    status.textContent = 'Buscando dirección…';
    const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ar&q=' + encodeURIComponent(query);
    try {
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      const results = await response.json();
      if (!results.length) {
        status.textContent = 'No encontramos esa dirección. Probá con calle y localidad, o marcá el mapa.';
        return;
      }
      searchInput.value = results[0].display_name;
      showPending(Number(results[0].lat), Number(results[0].lon), results[0].display_name);
    } catch (error) {
      status.textContent = 'No se pudo buscar. Marcá el punto en el mapa.';
    }
  }

  document.getElementById('btn-geocode').addEventListener('click', function () {
    if (searchInput.value.trim()) geocode(searchInput.value.trim());
  });
  searchInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (searchInput.value.trim()) geocode(searchInput.value.trim());
    }
  });
  confirmBtn.addEventListener('click', confirmPending);

  if (window.google && window.google.maps && window.google.maps.places) {
    const autocomplete = new window.google.maps.places.Autocomplete(searchInput, {
      componentRestrictions: { country: 'ar' },
      fields: ['geometry', 'formatted_address']
    });
    autocomplete.addListener('place_changed', function () {
      const place = autocomplete.getPlace();
      if (!place.geometry) return;
      showPending(place.geometry.location.lat(), place.geometry.location.lng(), place.formatted_address);
    });
  }

  pickupToggle.addEventListener('change', function () {
    syncPickup();
    pendingOrigin = null;
    confirmBtn.hidden = true;
    confirmedBox.hidden = true;
  });
  form.time_slot.addEventListener('change', function () {
    if (latInput.value && lngInput.value) {
      quote(Number(latInput.value), Number(lngInput.value), addressInput.value);
    }
  });

  const slotStatus = document.getElementById('slot-status');

  async function refreshAvailability() {
    const date = form.date.value;
    if (!date || !cfg.venue) return;
    slotStatus.textContent = 'Consultando cupos en ' + cfg.venue.name + '…';
    try {
      const payload = await window.RendiYaHttp.fetchJson('/products/turnos?sede=' + encodeURIComponent(cfg.venue.slug) + '&date=' + encodeURIComponent(date));
      if (!payload.success) throw new Error(payload.message);
      const data = payload.data;
      const bySlot = {};
      data.slots.forEach(function (slot) { bySlot[slot.time_slot] = slot; });

      Array.prototype.forEach.call(form.time_slot.options, function (option) {
        const slot = bySlot[option.value];
        option.disabled = Boolean(slot && !slot.available);
        option.textContent = slot
          ? option.value + (slot.available ? ' · ' + slot.free + ' libres' : ' · completo')
          : option.value;
      });

      if (!data.open) {
        slotStatus.textContent = cfg.venue.name + ' no toma exámenes ese día. Elegí otra fecha.';
        return;
      }
      const chosen = bySlot[form.time_slot.value];
      if (chosen && !chosen.available) {
        const free = data.slots.find(function (slot) { return slot.available; });
        if (free) form.time_slot.value = free.time_slot;
      }
      slotStatus.textContent = 'Cupos actualizados para el ' + data.date + ' en ' + cfg.venue.name + '.';
    } catch (error) {
      console.error('[checkout] No se pudo consultar el cupo', error);
      slotStatus.textContent = 'No pudimos consultar el cupo ahora. Podés reservar igual.';
    }
  }

  form.date.addEventListener('change', refreshAvailability);
  if (form.date.value) refreshAvailability();
  syncPickup();
  if (latInput.value && lngInput.value) {
    const lat = Number(latInput.value);
    const lng = Number(lngInput.value);
    pendingOrigin = { lat, lng, address: addressInput.value };
    if (originMarker) map.removeLayer(originMarker);
    originMarker = window.L.marker([lat, lng]).addTo(map);
    map.fitBounds(window.L.latLngBounds([[lat, lng], dest]), { padding: [40, 40] });
    confirmedBox.hidden = false;
    confirmedBox.textContent = 'Retiro confirmado: ' + (addressInput.value || 'punto en el mapa');
    frame.src = gmapsUrl(lat, lng);
  }
  setTimeout(function () { map.invalidateSize(); }, 200);

  function payPanel(method) {
    ['card', 'mercadopago', 'transfer'].forEach(function (name) {
      const panel = document.getElementById('pay-' + name);
      if (panel) panel.hidden = name !== method;
    });
  }

  form.querySelectorAll('input[name="payment_method"]').forEach(function (input) {
    input.addEventListener('change', function () {
      payPanel(input.value);
    });
  });

  form.addEventListener('submit', function (event) {
    if (form.getAttribute('data-confirmed') === '1') return;

    event.preventDefault();

    if (pickupToggle.checked && (!latInput.value || !lngInput.value)) {
      if (window.Swal) {
        window.Swal.fire({
          icon: 'warning',
          title: pendingOrigin ? 'Confirmá el retiro' : 'Falta el punto de retiro',
          text: pendingOrigin
            ? 'Encontramos el punto. Tocá “Confirmar este retiro” para dejarlo efectivo.'
            : 'Buscá o marcá en el mapa de dónde te tiene que retirar el instructor, y confirmá.',
          background: '#151b2b',
          color: '#f4f7ff',
          confirmButtonColor: '#8b5cf6'
        });
      }
      return;
    }

    const phone = String((form.contact_phone && form.contact_phone.value) || '').replace(/\D/g, '');
    if (phone.length < 10) {
      if (window.Swal) {
        window.Swal.fire({
          icon: 'warning',
          title: 'Falta tu WhatsApp',
          text: 'Necesitamos un teléfono para coordinar el servicio. El email ya lo tenemos de tu cuenta.',
          background: '#151b2b',
          color: '#f4f7ff',
          confirmButtonColor: '#8b5cf6'
        });
      }
      return;
    }

    const method = form.querySelector('input[name="payment_method"]:checked');
    if (!method) {
      if (window.Swal) {
        window.Swal.fire({
          icon: 'warning',
          title: 'Elegí un medio de pago',
          text: 'Tarjeta, Mercado Pago o transferencia. El cobro se completa en la pasarela (sin débito real).',
          background: '#151b2b',
          color: '#f4f7ff',
          confirmButtonColor: '#8b5cf6'
        });
      }
      return;
    }

    const email = cfg.userEmail || 'tu email';
    const finish = function () {
      form.setAttribute('data-confirmed', '1');
      form.submit();
    };

    if (!window.Swal) {
      if (window.confirm('Después de pagar te vamos a escribir por email y WhatsApp para coordinar el servicio.')) {
        finish();
      }
      return;
    }

    window.Swal.fire({
      icon: 'warning',
      title: 'Ir a la pasarela',
      html: 'Vas a abrir <strong>RendiYa Pay</strong> para acreditar el turno. En esta versión <strong>no se debita dinero</strong>.<br><br>Después te escribimos por <strong>email</strong> (' + email + ') y <strong>WhatsApp</strong> (' + (form.contact_phone.value || '') + ').',
      showCancelButton: true,
      reverseButtons: true,
      confirmButtonText: 'Continuar al pago',
      cancelButtonText: 'Volver',
      background: '#151b2b',
      color: '#f4f7ff',
      confirmButtonColor: '#8b5cf6',
      cancelButtonColor: '#334155'
    }).then(function (result) {
      if (result.isConfirmed) finish();
    });
  });
})();
