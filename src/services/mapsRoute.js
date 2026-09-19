const KEY = process.env.GOOGLE_MAPS_API_KEY || '';

async function fetchJson(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function googleDistanceKm(origin, destination) {
  const params = new URLSearchParams({
    origins: `${origin.lat},${origin.lng}`,
    destinations: `${destination.lat},${destination.lng}`,
    mode: 'driving',
    language: 'es',
    key: KEY
  });
  const data = await fetchJson(`https://maps.googleapis.com/maps/api/distancematrix/json?${params}`, 6000);
  const meters = data.rows && data.rows[0] && data.rows[0].elements && data.rows[0].elements[0].distance
    ? data.rows[0].elements[0].distance.value
    : null;
  if (!meters) {
    throw new Error(data.error_message || 'Google Maps no pudo calcular la ruta');
  }
  return meters / 1000;
}

async function osrmDistanceKm(origin, destination) {
  const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=false`;
  const data = await fetchJson(url, 6000);
  const meters = data.routes && data.routes[0] && data.routes[0].distance;
  if (!meters) {
    throw new Error('No se pudo calcular la ruta hasta la sede');
  }
  return meters / 1000;
}

function haversineKm(origin, destination) {
  const toRad = (value) => (Number(value) * Math.PI) / 180;
  const dLat = toRad(destination.lat - origin.lat);
  const dLng = toRad(destination.lng - origin.lng);
  const lat1 = toRad(origin.lat);
  const lat2 = toRad(destination.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

async function drivingDistanceKm(origin, destination) {
  const lat = Number(origin.lat);
  const lng = Number(origin.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error('Ubicación de retiro inválida');
  }
  if (lat < -55 || lat > -21 || lng < -74 || lng > -53) {
    throw new Error('El retiro tiene que estar en Argentina');
  }

  const point = { lat, lng };
  if (KEY) {
    try {
      return await googleDistanceKm(point, destination);
    } catch (error) {
      // fallback below
    }
  }
  try {
    return await osrmDistanceKm(point, destination);
  } catch (error) {
    return Math.max(1, haversineKm(point, destination) * 1.35);
  }
}

module.exports = { drivingDistanceKm, haversineKm };
