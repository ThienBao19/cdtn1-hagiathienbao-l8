// Khai báo URL -> controller. Express 4 không tự bắt lỗi của hàm async nên bọc qua wrap().
const express = require('express');
const { createCustomerController } = require('../controllers/customer.controller');
const { createTechnicianController } = require('../controllers/technician.controller');
const { createInvitationController } = require('../controllers/invitation.controller');
const { createSurveyController } = require('../controllers/survey.controller');

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function crud(router, path, c) {
  router.get(path, wrap(c.list));
  router.get(`${path}/:id`, wrap(c.get));
  router.post(path, wrap(c.create));
  router.put(`${path}/:id`, wrap(c.update));
  router.delete(`${path}/:id`, wrap(c.remove));
}

function createApiRouter(services) {
  const router = express.Router();
  crud(router, '/customers', createCustomerController(services.customerService));
  crud(router, '/technicians', createTechnicianController(services.technicianService));

  const invitation = createInvitationController(services.invitationService);
  router.post('/survey-invitations', wrap(invitation.create));               // API1

  const survey = createSurveyController(services.surveyService);
  router.get('/surveys/:token', wrap(survey.get));                           // API2
  router.post('/surveys/:token/responses', wrap(survey.respond));            // API3
  return router;
}

module.exports = { createApiRouter };
