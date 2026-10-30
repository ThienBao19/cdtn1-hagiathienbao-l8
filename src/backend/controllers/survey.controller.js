// SurveyController – API2 GET /api/surveys/{token}, API3 POST /api/surveys/{token}/responses
const { validateToken, validateResponseBody } = require('../validators/survey.validator');
const { logger } = require('../logger');

function createSurveyController(surveyService) {
  return {
    get: async (req, res) => res.json(await surveyService.getSurvey(validateToken(req.params.token))),
    respond: async (req, res) => {
      const token = validateToken(req.params.token);
      const saved = await surveyService.submitResponse(token, validateResponseBody(req.body));
      logger.info({ requestId: req.requestId, responseId: saved.response_id, ticketCode: saved.ticket_code,
        flagged: saved.is_flagged }, 'đã nhận phản hồi khảo sát');
      res.status(201).json(saved);
    },
  };
}

module.exports = { createSurveyController };
