const db = require('../database/models');
const { firstErrors } = require('../middlewares/validations');
const { ZONES, normalizeZone, listAutoescuelas, neighborhoodsByZone } = require('../services/autoescuelaService');
const { ensureVenues, venues } = require('../services/venues');
const { normalizePhone } = require('../utils/phone');

function optionalInt(value) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : null;
}

async function renderDirectory(req, res, { errors = {}, old = {}, status = 200 } = {}) {
  await ensureVenues();
  const zona = normalizeZone(req.query.zona);
  const barrio = String(req.query.barrio || '').trim();

  res.status(status).render('autoescuelas/index', {
    title: 'Autoescuelas recomendadas — RendiYa',
    autoescuelas: await listAutoescuelas({ zona, barrio }),
    neighborhoods: await neighborhoodsByZone(),
    zones: ZONES,
    zona,
    barrio,
    registered: req.query.registrada === '1',
    errors,
    old,
    venueList: venues()
  });
}

const autoescuelasController = {
  index: (req, res) => renderDirectory(req, res),

  registerLead: async (req, res) => {
    const errors = firstErrors(req);
    if (Object.keys(errors).length) {
      return renderDirectory(req, res, { errors, old: req.body, status: 422 });
    }

    await db.AutoescuelaLead.create({
      schoolName: req.body.schoolName.trim(),
      contactName: req.body.contactName.trim(),
      email: req.body.email.trim().toLowerCase(),
      phone: normalizePhone(req.body.phone),
      zone: normalizeZone(req.body.zone),
      neighborhood: req.body.neighborhood.trim(),
      monthlyStudents: optionalInt(req.body.monthlyStudents),
      fleetSize: optionalInt(req.body.fleetSize),
      message: String(req.body.message || '').trim() || null
    });

    res.redirect('/autoescuelas?registrada=1#registrar');
  }
};

module.exports = autoescuelasController;
