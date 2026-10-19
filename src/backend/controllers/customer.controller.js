// CustomerController – nhận request, gọi validator + service, trả JSON. Không chứa quy tắc nghiệp vụ.
const { validateCustomerBody } = require('../validators/customer.validator');
const { parseId, parseBool } = require('../validators/common');

function createCustomerController(customerService) {
  return {
    list: async (req, res) => {
      const items = await customerService.list({ includeInactive: parseBool(req.query.include_inactive) });
      res.json({ total: items.length, items });
    },
    get: async (req, res) => res.json(await customerService.get(parseId(req.params.id))),
    create: async (req, res) => res.status(201).json(await customerService.create(validateCustomerBody(req.body))),
    update: async (req, res) => res.json(await customerService.update(parseId(req.params.id), validateCustomerBody(req.body))),
    remove: async (req, res) => res.json(await customerService.deactivate(parseId(req.params.id))),
  };
}

module.exports = { createCustomerController };
