// Lỗi nghiệp vụ: chỉ mang MÃ LỖI + thông điệp cho người dùng, KHÔNG mang mã HTTP.
// Lớp routes/middlewares mới quyết định mã HTTP tương ứng (xem middlewares/error-handler.js).
class AppError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    if (details) this.details = details;
  }
}

// Lỗi dữ liệu vào không hợp lệ, luôn kèm tên trường để người gọi biết sửa ở đâu.
class ValidationError extends AppError {
  constructor(field, message) {
    super('VALIDATION_ERROR', message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

// Lỗi trùng khoá UNIQUE do repository báo lên (không lộ chi tiết của thư viện pg).
class DuplicateKeyError extends Error {
  constructor(constraint) {
    super(`duplicate key: ${constraint}`);
    this.name = 'DuplicateKeyError';
    this.constraint = constraint;
  }
}

module.exports = { AppError, ValidationError, DuplicateKeyError };
