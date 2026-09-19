module.exports = {
  CABA: {
    name: 'Centro de Evaluación de Conductores CABA (Parque Roca)',
    address: 'Av. Cruz y Av. Escalada, Villa Soldati, CABA',
    lat: -34.6779,
    lng: -58.4476
  },
  GBA: {
    name: 'Sede de examen práctico GBA (San Justo)',
    address: 'San Justo, La Matanza, Buenos Aires',
    lat: -34.6806,
    lng: -58.5633
  }
};

function examCenterForZone(zone) {
  const key = String(zone || '').toUpperCase().includes('GBA') ? 'GBA' : 'CABA';
  return module.exports[key];
}

module.exports.examCenterForZone = examCenterForZone;
