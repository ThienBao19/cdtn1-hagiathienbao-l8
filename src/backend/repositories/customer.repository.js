// CustomerRepository – chỉ chứa SQL cho bảng customer, không chứa quy tắc nghiệp vụ.
const { runQuery } = require('./pg-helpers');

const COLUMNS = 'customer_id, full_name, phone, is_active, created_at';

function createCustomerRepository(db) {
  return {
    async findAll({ includeInactive = false } = {}) {
      const where = includeInactive ? '' : 'WHERE is_active = TRUE';
      const { rows } = await runQuery(db, `SELECT ${COLUMNS} FROM customer ${where} ORDER BY customer_id`);
      return rows;
    },
    async findById(id) {
      const { rows } = await runQuery(db, `SELECT ${COLUMNS} FROM customer WHERE customer_id = $1`, [id]);
      return rows[0] || null;
    },
    async findByPhone(phone) {
      const { rows } = await runQuery(db, `SELECT ${COLUMNS} FROM customer WHERE phone = $1`, [phone]);
      return rows[0] || null;
    },
    async insert({ full_name, phone }) {
      const { rows } = await runQuery(db,
        `INSERT INTO customer (full_name, phone) VALUES ($1, $2) RETURNING ${COLUMNS}`, [full_name, phone]);
      return rows[0];
    },
    async update(id, { full_name, phone }) {
      const { rows } = await runQuery(db,
        `UPDATE customer SET full_name = $2, phone = $3 WHERE customer_id = $1 RETURNING ${COLUMNS}`, [id, full_name, phone]);
      return rows[0] || null;
    },
    async setActive(id, isActive) {
      const { rows } = await runQuery(db,
        `UPDATE customer SET is_active = $2 WHERE customer_id = $1 RETURNING ${COLUMNS}`, [id, isActive]);
      return rows[0] || null;
    },
  };
}

module.exports = { createCustomerRepository };
