// Tiện ích dùng chung cho các repository: dịch lỗi UNIQUE của PostgreSQL (23505)
// thành DuplicateKeyError để lớp service không phải biết mã lỗi của thư viện pg.
const { DuplicateKeyError } = require('../errors/app-error');

async function runQuery(db, sql, params) {
  try {
    return await db.query(sql, params);
  } catch (err) {
    if (err.code === '23505') throw new DuplicateKeyError(err.constraint);
    throw err;
  }
}

module.exports = { runQuery };
