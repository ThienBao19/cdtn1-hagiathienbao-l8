// TechnicianRepository – SQL cho bảng technician (kèm tên trung tâm để hiển thị).
const { runQuery } = require('./pg-helpers');

const SELECT = `SELECT t.technician_id, t.center_id, c.center_name, t.full_name, t.level, t.is_active
                FROM technician t JOIN service_center c ON c.center_id = t.center_id`;

function createTechnicianRepository(db) {
  return {
    async findAll({ centerId, includeInactive = false } = {}) {
      const cond = [];
      const params = [];
      if (!includeInactive) cond.push('t.is_active = TRUE');
      if (centerId) { params.push(centerId); cond.push(`t.center_id = $${params.length}`); }
      const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
      const { rows } = await runQuery(db, `${SELECT} ${where} ORDER BY t.technician_id`, params);
      return rows;
    },
    async findById(id) {
      const { rows } = await runQuery(db, `${SELECT} WHERE t.technician_id = $1`, [id]);
      return rows[0] || null;
    },
    async centerExists(centerId) {
      const { rowCount } = await runQuery(db, 'SELECT 1 FROM service_center WHERE center_id = $1', [centerId]);
      return rowCount > 0;
    },
    async insert({ center_id, full_name, level }) {
      const { rows } = await runQuery(db,
        'INSERT INTO technician (center_id, full_name, level) VALUES ($1, $2, $3) RETURNING technician_id',
        [center_id, full_name, level]);
      return this.findById(rows[0].technician_id);
    },
    async update(id, { center_id, full_name, level }) {
      const { rowCount } = await runQuery(db,
        'UPDATE technician SET center_id = $2, full_name = $3, level = $4 WHERE technician_id = $1',
        [id, center_id, full_name, level]);
      return rowCount ? this.findById(id) : null;
    },
    async setActive(id, isActive) {
      const { rowCount } = await runQuery(db,
        'UPDATE technician SET is_active = $2 WHERE technician_id = $1', [id, isActive]);
      return rowCount ? this.findById(id) : null;
    },
  };
}

module.exports = { createTechnicianRepository };
