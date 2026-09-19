/**
 * Tarifa de taxímetro CABA (GCBA / Ente de la Ciudad).
 * 1 ficha = 200 m de recorrido o 1 minuto detenido.
 * Bajada de bandera = 10 fichas.
 * Nocturna (22 a 6 h) = +20 % sobre la ficha diurna.
 * Fuera de CABA, sin regreso en el mismo viaje, se suma el retorno vacío.
 */
const FICHA_DIURNA = 255;
const FICHA_NOCTURNA = 306;
const METERS_PER_FICHA = 200;
const BAJADA_FICHAS = 10;
const INSTRUCTOR_FEE = 15000;

function isNightSlot(timeSlot) {
  const start = String(timeSlot || '').slice(0, 5);
  const hour = Number(start.split(':')[0]);
  if (!Number.isFinite(hour)) return false;
  return hour >= 22 || hour < 6;
}

function quotePickup({ km, outsideCity = false, night = false } = {}) {
  const distanceKm = Math.min(80, Math.max(0, Number(km) || 0));
  const ficha = night ? FICHA_NOCTURNA : FICHA_DIURNA;
  const bajada = BAJADA_FICHAS * ficha;
  const travelFichas = Math.ceil((distanceKm * 1000) / METERS_PER_FICHA);
  const travel = travelFichas * ficha;
  const retorno = outsideCity ? travel : 0;
  const total = bajada + travel + retorno;

  return {
    distanceKm,
    ficha,
    bajada,
    travelFichas,
    travel,
    retorno,
    night,
    outsideCity,
    total
  };
}

function bookingTotals({ productPrice = 0, instructor = false, pickup = false, pickupKm = 0, outsideCity = false, timeSlot = '' } = {}) {
  const instructorFee = instructor ? INSTRUCTOR_FEE : 0;
  const pickupQuote = instructor && pickup && pickupKm > 0
    ? quotePickup({ km: pickupKm, outsideCity, night: isNightSlot(timeSlot) })
    : quotePickup({ km: 0 });
  const pickupFee = instructor && pickup ? pickupQuote.total : 0;

  return {
    vehicle: Number(productPrice) || 0,
    instructorFee,
    pickupFee,
    pickupQuote,
    total: (Number(productPrice) || 0) + instructorFee + pickupFee
  };
}

module.exports = {
  FICHA_DIURNA,
  FICHA_NOCTURNA,
  METERS_PER_FICHA,
  BAJADA_FICHAS,
  INSTRUCTOR_FEE,
  isNightSlot,
  quotePickup,
  bookingTotals
};
