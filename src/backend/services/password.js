// Băm và kiểm tra mật khẩu bằng scrypt (có sẵn trong Node, không cần thư viện native).
// Định dạng lưu: scrypt$<salt hex>$<hash hex>
const crypto = require('crypto');

const KEY_LEN = 32;

/**
 * Băm mật khẩu kèm salt ngẫu nhiên.
 * @param {string} password Mật khẩu bản rõ.
 * @param {string} [salt] Salt hex; chỉ truyền khi cần kết quả cố định (sinh dữ liệu mẫu).
 * @returns {string} Chuỗi dạng scrypt$salt$hash để lưu vào app_user.password_hash.
 */
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, KEY_LEN).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

/**
 * So khớp mật khẩu với chuỗi băm đã lưu, so sánh thời gian hằng để tránh dò theo thời gian phản hồi.
 * @returns {boolean} false nếu sai mật khẩu hoặc chuỗi băm sai định dạng (không ném lỗi).
 */
function verifyPassword(password, stored) {
  const [algo, salt, hash] = String(stored || '').split('$');
  if (algo !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = crypto.scryptSync(String(password), salt, expected.length);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

module.exports = { hashPassword, verifyPassword };
