// Khai báo URL -> controller. Express 4 không tự bắt lỗi của hàm async nên bọc qua wrap().
const express = require('express');
const { createCustomerController } = require('../controllers/customer.controller');
const { createTechnicianController } = require('../controllers/technician.controller');
const { createInvitationController } = require('../controllers/invitation.controller');
const { createSurveyController } = require('../controllers/survey.controller');
const { createAuthController } = require('../controllers/auth.controller');
const { createResponseController } = require('../controllers/response.controller');
const { createReportController } = require('../controllers/report.controller');
const { requireAuth } = require('../middlewares/auth');

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
  if (services.customerService) crud(router, '/customers', createCustomerController(services.customerService));
  if (services.technicianService) crud(router, '/technicians', createTechnicianController(services.technicianService));

  if (services.invitationService) {
    const invitation = createInvitationController(services.invitationService);
    router.post('/survey-invitations', wrap(invitation.create));             // API1
  }

  const survey = createSurveyController(services.surveyService);
  router.get('/surveys/:token', wrap(survey.get));                           // API2
  router.post('/surveys/:token/responses', wrap(survey.respond));            // API3

  // Sprint 2 – các route cần đăng nhập (JWT). Chỉ đăng ký khi container có authService.
  if (services.authService) {
    const auth = requireAuth(services.authService);
    router.post('/auth/login', wrap(createAuthController(services.authService).login));
    const responses = createResponseController(services.responseService);
    router.get('/survey-responses', auth, wrap(responses.list));                // API4
    const reports = createReportController(services.reportService);
    router.get('/reports/technicians', auth, wrap(reports.technicians));        // US6
    router.get('/reports/monthly-trend', auth, wrap(reports.monthlyTrend));     // US7
  }
  return router;
}

module.exports = { createApiRouter };
