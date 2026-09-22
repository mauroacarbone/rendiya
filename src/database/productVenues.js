/**
 * Sede operativa de cada vehículo de la flota inicial. Lo usan el seed y la
 * migración, así una base ya cargada queda igual que una base nueva.
 */
const PRODUCT_VENUES = {
  'Toyota Etios': 'caba-parque-roca',
  'Volkswagen Gol Trend': 'caba-parque-roca',
  'Honda Wave': 'caba-parque-roca',
  'Fiat Cronos': 'caba-nunez',
  'Yamaha Fazer': 'caba-nunez',
  'Ford Ka': 'gba-san-justo',
  'Honda Titan': 'gba-san-justo',
  'Chevrolet Prisma': 'gba-vicente-lopez'
};

module.exports = { PRODUCT_VENUES };
