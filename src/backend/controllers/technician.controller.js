// TechnicianController
const { validateTechnicianBody } = require('../validators/technician.validator');
const { parseId, parseBool } = require('../validators/common');

function createTechnicianController(technicianService) {
  return {
    list: async (req, res) => {
      const centerId = req.query.center_id !== undefined ? parseId(req.query.center_id, 'center_id') : undefined;
      const items = await technicianService.list({ centerId, includeInactive: parseBool(req.query.include_inactive) });
      res.json({ total: items.length, items });
    },
    get: async (req, res) => res.json(await technicianService.get(parseId(req.params.id))),
    create: async (req, res) => res.status(201).json(await technicianService.create(validateTechnicianBody(req.body))),
    update: async (req, res) => res.json(await technicianService.update(parseId(req.params.id), validateTechnicianBody(req.body))),
    remove: async (req, res) => res.json(await technicianService.deactivate(parseId(req.params.id))),
  };
}

module.exports = { createTechnicianController };
