// UserRepository – SQL cho bảng app_user (tài khoản Nhân viên / Quản lý trung tâm).
const { runQuery } = require('./pg-helpers');

function createUserRepository(db) {
  return {
    async findByUsername(username) {
      const { rows } = await runQuery(db,
        `SELECT u.user_id, u.username, u.password_hash, u.full_name, u.role, u.center_id, u.is_active, c.center_name
         FROM app_user u JOIN service_center c ON c.center_id = u.center_id
         WHERE u.username = $1`, [username]);
      return rows[0] || null;
    },
  };
}

module.exports = { createUserRepository };
