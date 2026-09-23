const { Op } = require('sequelize');
const db = require('../database/models');
const { COUNTRY_CODE, digitsOf, displayPhone, normalizePhone } = require('../utils/phone');

const ZONES = ['CABA', 'GBA'];

function normalizeZone(value) {
  const zone = String(value || '').trim().toUpperCase();
  return ZONES.includes(zone) ? zone : '';
}

function initials(name) {
  return String(name || '')
    .replace(/^autoescuela\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
}

function whatsappUrl(phone, text) {
  let digits = digitsOf(normalizePhone(phone));
  // wa.me necesita el 9 de celular argentino: +54 9 11 ...
  if (digits.startsWith(COUNTRY_CODE) && !digits.startsWith(`${COUNTRY_CODE}9`)) {
    digits = `${COUNTRY_CODE}9${digits.slice(COUNTRY_CODE.length)}`;
  }
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

function presentAutoescuela(record) {
  const json = record.toJSON ? record.toJSON() : { ...record };
  return {
    id: json.id,
    name: json.name,
    logo: json.logo || null,
    initials: initials(json.name),
    zone: json.zone,
    neighborhood: json.neighborhood,
    phone: normalizePhone(json.phone),
    phoneDisplay: displayPhone(json.phone),
    whatsappUrl: whatsappUrl(json.phone, `Hola ${json.name}, los encontré en RendiYa y quiero consultar por clases de manejo.`),
    rating: Number(json.rating),
    status: json.status,
    featured: json.status === 'featured'
  };
}

/**
 * `zona` acepta CABA/GBA; `barrio` busca por coincidencia parcial para que
 * "palermo" encuentre "Palermo Soho". Las destacadas van primero.
 */
async function listAutoescuelas({ zona, barrio, status } = {}) {
  const where = { active: true };
  const zone = normalizeZone(zona);
  if (zone) {
    where.zone = zone;
  }
  if (barrio && String(barrio).trim()) {
    where.neighborhood = { [Op.like]: `%${String(barrio).trim()}%` };
  }
  if (status && db.Autoescuela.STATUSES.includes(status)) {
    where.status = status;
  }

  const rows = await db.Autoescuela.findAll({
    where,
    order: [
      [db.sequelize.literal("CASE WHEN status = 'featured' THEN 0 ELSE 1 END"), 'ASC'],
      ['rating', 'DESC'],
      ['name', 'ASC']
    ]
  });
  return rows.map(presentAutoescuela);
}

async function neighborhoodsByZone() {
  const rows = await db.Autoescuela.findAll({
    attributes: ['zone', 'neighborhood'],
    where: { active: true },
    group: ['zone', 'neighborhood'],
    order: [['neighborhood', 'ASC']]
  });
  return rows.reduce((groups, row) => {
    (groups[row.zone] = groups[row.zone] || []).push(row.neighborhood);
    return groups;
  }, {});
}

const LEAD_STATUS_ALIASES = {
  pendiente: 'new',
  contactado: 'contacted',
  aprobado: 'approved',
  descartado: 'rejected'
};

function normalizeLeadStatus(value) {
  const status = String(value || '').trim().toLowerCase();
  const resolved = LEAD_STATUS_ALIASES[status] || status;
  return db.AutoescuelaLead.STATUSES.includes(resolved) ? resolved : null;
}

const LEAD_INCLUDE = [
  { association: 'autoescuela', attributes: ['id', 'active'] },
  { association: 'statusChangedBy', attributes: ['id', 'firstName', 'lastName', 'email'] }
];

function presentChangedBy(user) {
  if (!user) return null;
  const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  return { id: user.id, name: name || user.email, email: user.email };
}

function presentLead(record) {
  const json = record.toJSON ? record.toJSON() : { ...record };
  return {
    id: json.id,
    schoolName: json.schoolName,
    contactName: json.contactName,
    email: json.email,
    phone: normalizePhone(json.phone),
    phoneDisplay: displayPhone(json.phone),
    whatsappUrl: whatsappUrl(json.phone, `Hola ${json.contactName}, te escribimos de RendiYa por la solicitud de ${json.schoolName} para sumarse al directorio de autoescuelas.`),
    zone: json.zone,
    neighborhood: json.neighborhood,
    message: json.message,
    monthlyStudents: json.monthlyStudents ?? null,
    fleetSize: json.fleetSize ?? null,
    status: json.status,
    statusChangedAt: json.statusChangedAt || null,
    statusChangedBy: presentChangedBy(json.statusChangedBy),
    autoescuelaId: json.autoescuelaId || null,
    published: Boolean(json.autoescuela && json.autoescuela.active),
    createdAt: json.createdAt,
    updatedAt: json.updatedAt
  };
}

/** `q` busca por coincidencia parcial en nombre de la escuela, contacto o email. */
async function listLeads({ status, q } = {}) {
  const where = {};
  const normalized = normalizeLeadStatus(status);
  if (normalized) {
    where.status = normalized;
  }
  const term = String(q || '').trim();
  if (term) {
    where[Op.or] = ['schoolName', 'contactName', 'email'].map((field) => ({
      [field]: { [Op.like]: `%${term}%` }
    }));
  }
  const rows = await db.AutoescuelaLead.findAll({
    where,
    include: LEAD_INCLUDE,
    order: [['createdAt', 'DESC'], ['id', 'DESC']]
  });
  return rows.map(presentLead);
}

/**
 * `approved` publica la autoescuela (la crea la primera vez y la reactiva si
 * ya existía); cualquier otro estado la saca del directorio sin borrarla, así
 * volver a aprobar conserva calificación y destacado.
 */
async function updateLeadStatus(id, status, changedBy) {
  return db.sequelize.transaction(async (transaction) => {
    const lead = await db.AutoescuelaLead.findByPk(id, { transaction });
    if (!lead) return null;

    let school = lead.autoescuelaId
      ? await db.Autoescuela.findByPk(lead.autoescuelaId, { transaction })
      : null;

    if (status === 'approved') {
      if (school) {
        await school.update({ active: true }, { transaction });
      } else {
        school = await db.Autoescuela.create({
          name: lead.schoolName,
          zone: lead.zone,
          neighborhood: lead.neighborhood,
          phone: lead.phone,
          rating: 0,
          status: 'standard',
          active: true
        }, { transaction });
      }
    } else if (school && school.active) {
      await school.update({ active: false }, { transaction });
    }

    await lead.update({
      status,
      autoescuelaId: school ? school.id : null,
      statusChangedAt: new Date(),
      statusChangedById: changedBy && changedBy.id ? changedBy.id : null
    }, { transaction });
    await lead.reload({ include: LEAD_INCLUDE, transaction });
    return presentLead(lead);
  });
}

module.exports = {
  ZONES,
  normalizeZone,
  normalizeLeadStatus,
  presentAutoescuela,
  listAutoescuelas,
  neighborhoodsByZone,
  listLeads,
  updateLeadStatus
};
