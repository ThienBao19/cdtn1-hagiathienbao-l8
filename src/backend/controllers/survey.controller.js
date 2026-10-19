// SurveyController – API2 GET /api/surveys/{token}, API3 POST /api/surveys/{token}/responses
const { validateToken, validateResponseBody } = require('../validators/survey.validator');

function createSurveyController(surveyService) {
  return {
    get: async (req, res) => res.json(await surveyService.getSurvey(validateToken(req.params.token))),
    respond: async (req, res) => {
      const token = validateToken(req.params.token);
      res.status(201).json(await surveyService.submitResponse(token, validateResponseBody(req.body)));
    },
  };
}

module.exports = { createSurveyController };
