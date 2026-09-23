const db = require('../../database/models');
const { ZONES, listAutoescuelas, listLeads, updateLeadStatus, normalizeLeadStatus } = require('../../services/autoescuelaService');
const { absoluteUrl } = require('../../utils/apiHelpers');

module.exports = {
  async list(req, res) {
    try {
      const zona = req.query.zona || req.query.zone;
      const barrio = req.query.barrio || req.query.neighborhood;
      const autoescuelas = await listAutoescuelas({ zona, barrio, status: req.query.status });

      res.json({
        count: autoescuelas.length,
        zones: ZONES,
        filters: { zona: zona || null, barrio: barrio || null, status: req.query.status || null },
        autoescuelas: autoescuelas.map((item) => ({
          ...item,
          logo: absoluteUrl(req, item.logo)
        }))
      });
    } catch (error) {
      res.status(500).json({ error: 'No se pudo listar autoescuelas' });
    }
  },

  async leads(req, res) {
    try {
      const leads = await listLeads({ status: req.query.status, q: req.query.q });
      const countByStatus = db.AutoescuelaLead.STATUSES.reduce((totals, status) => {
        totals[status] = leads.filter((lead) => lead.status === status).length;
        return totals;
      }, {});

      res.json({
        count: leads.length,
        statuses: db.AutoescuelaLead.STATUSES,
        countByStatus,
        leads
      });
    } catch (error) {
      console.error('[leads] No se pudieron listar los leads:', error);
      res.status(500).json({ error: 'No se pudieron listar los leads' });
    }
  },

  async updateLead(req, res) {
    if (!req.is('application/json')) {
      return res.status(415).json({ error: 'Enviá el cuerpo como JSON' });
    }
    const status = normalizeLeadStatus(req.body && req.body.status);
    if (!status) {
      return res.status(422).json({
        error: `Estado inválido. Usá: ${db.AutoescuelaLead.STATUSES.join(', ')} (o pendiente, contactado, aprobado, descartado)`
      });
    }

    try {
      const lead = await updateLeadStatus(req.params.id, status, req.session.user);
      if (!lead) {
        return res.status(404).json({ error: 'Lead no encontrado' });
      }
      res.json({ lead });
    } catch (error) {
      console.error(`[leads] No se pudo actualizar el lead ${req.params.id} a "${status}":`, error);
      res.status(500).json({ error: 'No se pudo actualizar el lead' });
    }
  }
};
