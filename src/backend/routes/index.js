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
const { AppError } = require('../errors/app-error');

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function crud(router, path, c, auth) {
  router.get(path, auth, wrap(c.list));
  router.get(`${path}/:id`, auth, wrap(c.get));
  router.post(path, auth, wrap(c.create));
  router.put(`${path}/:id`, auth, wrap(c.update));
  router.delete(`${path}/:id`, auth, wrap(c.remove));
}

// Không có authService (cấu hình thiếu) thì TỪ CHỐI mọi route cần đăng nhập, không mở toang (fail closed – BUG-006).
const denyAll = (req, res, next) => next(new AppError('UNAUTHORIZED', 'Vui lòng đăng nhập'));

function createApiRouter(services) {
  const router = express.Router();
  // OWASP A01 (BUG-006): mọi route nội bộ – CRUD khách hàng, kỹ thuật viên, tạo lời mời (API1) – đều cần đăng nhập.
  // Chỉ API2, API3 (khách mở link có mã lời mời 64 ký tự) và đăng nhập là công khai.
  const auth = services.authService ? requireAuth(services.authService) : denyAll;

  if (services.customerService) crud(router, '/customers', createCustomerController(services.customerService), auth);
  if (services.technicianService) crud(router, '/technicians', createTechnicianController(services.technicianService), auth);

  if (services.invitationService) {
    const invitation = createInvitationController(services.invitationService);
    router.post('/survey-invitations', auth, wrap(invitation.create));       // API1
  }

  const survey = createSurveyController(services.surveyService);
  router.get('/surveys/:token', wrap(survey.get));                           // API2 – công khai
  router.post('/surveys/:token/responses', wrap(survey.respond));            // API3 – công khai

  // Sprint 2 – đăng nhập (JWT) và các route của Nhân viên / Quản lý trung tâm.
  if (services.authService) {
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
