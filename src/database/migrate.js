const db = require('./models');
const { venues } = require('../services/venues');
const { PRODUCT_VENUES } = require('./productVenues');

/**
 * `sync()` no agrega columnas nuevas a tablas que ya existen. Los vehículos
 * cargados antes de las sedes necesitan el alta de `venue_slug` y una sede
 * asignada: la de la flota inicial si el vehículo es conocido, o la primera de
 * su zona para los que cargó un admin.
 */
async function ensureProductVenue() {
  const queryInterface = db.sequelize.getQueryInterface();
  const table = await queryInterface.describeTable('products');
  const column = 'venue_slug';

  if (!table[column]) {
    await queryInterface.addColumn('products', column, db.Product.getAttributes().venueSlug);
  }

  const known = new Set(venues().map((venue) => venue.slug));
  const pending = await db.Product.findAll({
    where: { venueSlug: null },
    include: [{ association: 'zone' }]
  });

  for (const product of pending) {
    const mapped = PRODUCT_VENUES[product.name];
    if (mapped && known.has(mapped)) {
      await product.update({ venueSlug: mapped });
      continue;
    }
    const zone = product.zone ? product.zone.name : 'CABA';
    const match = venues().find((venue) => String(venue.zone).toUpperCase() === String(zone).toUpperCase());
    if (match) {
      await product.update({ venueSlug: match.slug });
    }
  }
}

async function ensureColumn(model, attribute) {
  const queryInterface = db.sequelize.getQueryInterface();
  const tableName = model.getTableName();
  const definition = model.getAttributes()[attribute];
  const table = await queryInterface.describeTable(tableName);
  if (!table[definition.field]) {
    await queryInterface.addColumn(tableName, definition.field, definition);
  }
}

async function ensureUserPhone() {
  await ensureColumn(db.User, 'phone');
}

async function ensureAutoescuelaColumns() {
  await ensureColumn(db.Autoescuela, 'active');
  await ensureColumn(db.AutoescuelaLead, 'autoescuelaId');
  await ensureColumn(db.AutoescuelaLead, 'monthlyStudents');
  await ensureColumn(db.AutoescuelaLead, 'fleetSize');
  await ensureColumn(db.AutoescuelaLead, 'statusChangedAt');
  await ensureColumn(db.AutoescuelaLead, 'statusChangedById');
}

module.exports = { ensureProductVenue, ensureUserPhone, ensureAutoescuelaColumns };
