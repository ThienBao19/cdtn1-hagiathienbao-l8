// Dựng CSDL thử THẬT cho integration test (TC-09, TC-12). Phải require file này TRƯỚC mọi module của backend:
// nó đổi DB_NAME sang CSDL riêng cho test để không bao giờ chạm vào CSDL smartcrm đang dùng.
//  • Tên CSDL thử: DB_NAME_TEST (mặc định smartcrm_test) – bắt buộc kết thúc bằng "_test".
//  • Thông tin kết nối (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD) lấy từ .env như khi chạy thật.
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
process.env.DB_NAME = process.env.DB_NAME_TEST || 'smartcrm_test';
if (!process.env.DB_NAME.endsWith('_test')) {
  throw new Error(`DB_NAME_TEST phải kết thúc bằng "_test" (đang là "${process.env.DB_NAME}") – chặn xoá nhầm CSDL thật`);
}

const { Client } = require('pg');
const env = require('../../src/backend/config/env');
const { migrate, ensureDatabase } = require('../../src/backend/scripts/migrate');
const { seed } = require('../../src/backend/scripts/seed');
const { createPool } = require('../../src/backend/db/pool');

const TABLES = ['service_center', 'technician', 'customer', 'ticket', 'survey_invitation', 'survey_response', 'app_user', 'schema_migrations'];

/** Chạy hàm in nhiều dòng (migrate, seed) mà không làm rối kết quả Jest. */
async function quietly(fn) {
  const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
  try { return await fn(); } finally { spy.mockRestore(); }
}

/** Xoá sạch CSDL thử rồi chạy lại toàn bộ migration – gọi trong beforeEach để mỗi test bắt đầu từ trạng thái biết trước. */
async function resetDb() {
  await quietly(async () => {
    await ensureDatabase();
    const c = new Client({ ...env.db, connectionTimeoutMillis: 3000 });
    await c.connect();
    try {
      await c.query('DROP SCHEMA public CASCADE');
      await c.query('CREATE SCHEMA public');
    } finally { await c.end(); }
    await migrate();
  });
}

/** Đếm số dòng của từng bảng – dùng để kiểm tác dụng phụ (đếm trước/sau). */
async function countRows(db) {
  const out = {};
  for (const t of TABLES) out[t] = (await db.query(`SELECT COUNT(*)::int AS n FROM ${t}`)).rows[0].n;
  return out;
}

/** Dữ liệu tối thiểu cho TC-09: 1 trung tâm, 1 khách, 1 phiếu Đã đóng, 1 lời mời vừa tạo. */
async function seedOneInvitation(db, token) {
  await db.query(`INSERT INTO service_center (center_id, center_code, center_name, city)
                  VALUES (1, 'TT-Q10', 'Trung tâm bảo hành Quận 10', 'TP. Hồ Chí Minh')`);
  await db.query(`INSERT INTO customer (customer_id, full_name, phone) VALUES (1, 'Nguyễn Văn Hùng', '0901234567')`);
  await db.query(`INSERT INTO ticket (ticket_id, ticket_code, center_id, customer_id, device_model, status, received_at, closed_at)
                  VALUES (1, 'BH-000123/2026', 1, 1, 'iPhone 13 128GB', 'DA_DONG', now() - interval '3 days', now() - interval '1 hour')`);
  await db.query('INSERT INTO survey_invitation (invitation_id, ticket_id, token) VALUES (1, 1, $1)', [token]);
}

module.exports = { env, migrate, seed, createPool, resetDb, countRows, seedOneInvitation, quietly };
