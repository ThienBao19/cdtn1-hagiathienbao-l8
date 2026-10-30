// Chuyển lỗi thành JSON {"error":{"code","message"}} theo docs/api-contract.md.
// Đây là NƠI DUY NHẤT ánh xạ mã lỗi nghiệp vụ -> mã HTTP.
const { AppError } = require('../errors/app-error');
const { logger: defaultLogger } = require('../logger');

const HTTP_STATUS = {
  VALIDATION_ERROR: 400,
  INVALID_JSON: 400,
  NOT_FOUND: 404,
  TICKET_NOT_FOUND: 404,
  INVITATION_NOT_FOUND: 404,
  CUSTOMER_NOT_FOUND: 404,
  TECHNICIAN_NOT_FOUND: 404,
  CENTER_NOT_FOUND: 400, // center_id gửi trong body không tồn tại -> lỗi dữ liệu vào
  TICKET_NOT_CLOSED: 409,
  INVITATION_EXISTS: 409,
  ALREADY_RESPONDED: 409,
  PHONE_EXISTS: 409,
  CUSTOMER_INACTIVE: 409,
  TECHNICIAN_INACTIVE: 409,
  INVITATION_EXPIRED: 410,
  UNAUTHORIZED: 401,
  INVALID_CREDENTIALS: 401,
  FORBIDDEN: 403,
};

// Mã lỗi kết nối của pg/Node khi CSDL tắt hoặc sai cấu hình.
const DB_DOWN_CODES = new Set(['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', '57P01', '57P03', '3D000', '28P01', '28000']);

function notFoundHandler(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `Không có endpoint ${req.method} ${req.path}` } });
}

/**
 * Middleware lỗi DUY NHẤT – đăng ký cuối cùng trong app.js. Ghi log đúng MỘT lần cho mỗi lỗi:
 *  • lỗi nghiệp vụ / dữ liệu vào (4xx): mức INFO, chỉ mã lỗi và đường dẫn – đây là nghiệp vụ bình thường;
 *  • lỗi hạ tầng / không lường trước (5xx): mức ERROR kèm ngăn xếp, người dùng chỉ nhận "Mã tra cứu".
 */
function createErrorHandler(logger = defaultLogger) {
  // eslint-disable-next-line no-unused-vars
  return function errorHandler(err, req, res, next) {
    const ctx = { requestId: req.requestId, method: req.method, path: req.path };
    if (err instanceof AppError) {
      logger.info({ ...ctx, code: err.code }, 'từ chối yêu cầu');
      const body = { code: err.code, message: err.message };
      if (err.field) body.field = err.field;
      if (err.details) body.details = err.details;
      return res.status(HTTP_STATUS[err.code] || 400).json({ error: body });
    }
    if (err.type === 'entity.parse.failed') {
      logger.info({ ...ctx, code: 'INVALID_JSON' }, 'từ chối yêu cầu');
      return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Body không phải JSON hợp lệ' } });
    }
    const isDbDown = DB_DOWN_CODES.has(err.code) || /timeout exceeded when trying to connect|Connection terminated/i.test(err.message || '');
    if (isDbDown) {
      logger.error({ ...ctx, err }, 'không kết nối được cơ sở dữ liệu');
      return res.status(503).json({ error: { code: 'DB_UNAVAILABLE',
        message: `Không kết nối được cơ sở dữ liệu, vui lòng thử lại sau. Mã tra cứu: ${req.requestId}` } });
    }
    logger.error({ ...ctx, err }, 'lỗi hệ thống không lường trước'); // chi tiết chỉ nằm trong log
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR',
      message: `Lỗi hệ thống, vui lòng thử lại sau. Mã tra cứu: ${req.requestId}` } });
  };
}

const errorHandler = createErrorHandler();

module.exports = { errorHandler, createErrorHandler, notFoundHandler, HTTP_STATUS };
