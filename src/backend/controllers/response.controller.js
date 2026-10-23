// ResponseController – API4 GET /api/survey-responses
const { validateResponseQuery } = require('../validators/response.validator');

function createResponseController(responseService) {
  return {
    list: async (req, res) => res.json(await responseService.list(req.user, validateResponseQuery(req.query))),
  };
}

module.exports = { createResponseController };
