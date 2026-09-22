const { primaryVenueForZone, venueForProduct } = require('./venues');

/**
 * Compatibilidad: antes las sedes eran un objeto fijo por zona. Ahora se
 * administran en la API, así que estos helpers delegan en el servicio de sedes.
 */
function examCenterForZone(zone) {
  return primaryVenueForZone(zone);
}

module.exports = { examCenterForZone, examCenterForProduct: venueForProduct };
