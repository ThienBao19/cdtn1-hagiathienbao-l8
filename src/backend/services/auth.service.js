// AuthService – đăng nhập và kiểm tra phiên cho Nhân viên, Quản lý trung tâm (TD-14).
// Token JWT mang vai trò + center_id để áp dụng QT-14 (chỉ xem trung tâm mình) và QT-15 (che số điện thoại).
const jwt = require('jsonwebtoken');
const { AppError } = require('../errors/app-error');
const { verifyPassword } = require('./password');

const ROLES = { NHAN_VIEN: 'NHAN_VIEN', QUAN_LY: 'QUAN_LY' };

function createAuthService({ userRepository, secret, expiresIn = '8h' }) {
  return {
    /**
     * Đăng nhập bằng tên đăng nhập + mật khẩu.
     * @returns {Promise<{token: string, user: {username, full_name, role, center_id, center_name}}>}
     * @throws {AppError} INVALID_CREDENTIALS – sai tên/mật khẩu hoặc tài khoản đã ngừng (cùng một thông báo,
     *   không cho biết tên đăng nhập có tồn tại hay không).
     */
    async login(username, password) {
      const u = await userRepository.findByUsername(username);
      if (!u || !u.is_active || !verifyPassword(password, u.password_hash)) {
        throw new AppError('INVALID_CREDENTIALS', 'Sai tên đăng nhập hoặc mật khẩu');
      }
      const claims = { sub: u.user_id, username: u.username, role: u.role, center_id: u.center_id };
      return {
        token: jwt.sign(claims, secret, { expiresIn }),
        user: { username: u.username, full_name: u.full_name, role: u.role, center_id: u.center_id, center_name: u.center_name },
      };
    },

    /**
     * Giải mã token. @returns {{sub, username, role, center_id}}
     * @throws {AppError} UNAUTHORIZED khi thiếu, sai chữ ký hoặc hết hạn.
     */
    verify(token) {
      if (!token) throw new AppError('UNAUTHORIZED', 'Vui lòng đăng nhập');
      try {
        const c = jwt.verify(token, secret);
        return { sub: c.sub, username: c.username, role: c.role, center_id: c.center_id };
      } catch {
        throw new AppError('UNAUTHORIZED', 'Phiên làm việc đã hết hạn, vui lòng đăng nhập lại');
      }
    },
  };
}

module.exports = { createAuthService, ROLES };
