const { listVenuesFromApi } = require('./rendiyaApi');
const fallback = require('../data/venues.json');

const FRESH_MS = 5 * 60 * 1000;
const RETRY_MS = 30 * 1000;

let cache = fallback.venues;
let nextFetchAt = 0;
let inFlight = null;

/**
 * Las sedes se administran en la API, pero el catálogo tiene que renderizar
 * aunque la API esté dormida (Render Hobby). Por eso se refresca en segundo
 * plano y las vistas siempre leen la copia en memoria, que arranca con el
 * respaldo de `src/data/venues.json`.
 */
function ensureVenues() {
  if (!inFlight && Date.now() >= nextFetchAt) {
    inFlight = listVenuesFromApi()
      .then((fresh) => {
        if (Array.isArray(fresh) && fresh.length) {
          cache = fresh;
          nextFetchAt = Date.now() + FRESH_MS;
        } else {
          nextFetchAt = Date.now() + RETRY_MS;
        }
      })
      .catch(() => {
        nextFetchAt = Date.now() + RETRY_MS;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return cache;
}

function venues() {
  return cache;
}

function findVenue(slug) {
  if (!slug) return null;
  return cache.find((venue) => venue.slug === slug) || null;
}

function venuesForZone(zone) {
  const target = String(zone || '').toUpperCase();
  return cache.filter((venue) => String(venue.zone).toUpperCase() === target);
}

function primaryVenueForZone(zone) {
  const matches = venuesForZone(zone);
  return matches[0] || cache[0];
}

/**
 * La sede operativa del vehículo: la que tiene asignada o, si es un vehículo
 * viejo sin sede, la principal de su zona.
 */
function venueForProduct(product) {
  if (!product) {
    return cache[0];
  }
  return findVenue(product.venueSlug) || primaryVenueForZone(product.zone);
}

function slotsForVenue(venue) {
  const slots = venue && Array.isArray(venue.slots) ? venue.slots : [];
  return slots.length ? slots : ['08:00 – 11:00', '11:00 – 14:00', '14:00 – 17:00'];
}

module.exports = {
  ensureVenues,
  venues,
  findVenue,
  venuesForZone,
  primaryVenueForZone,
  venueForProduct,
  slotsForVenue
};
