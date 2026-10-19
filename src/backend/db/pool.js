// Một pool kết nối PostgreSQL dùng chung cho mọi repository.
const { Pool, types } = require('pg');
const env = require('../config/env');

// BIGINT (OID 20) mặc định trả về chuỗi; các khoá BIGSERIAL của hệ thống nhỏ hơn 2^53 nên đổi về số.
types.setTypeParser(20, (v) => Number.parseInt(v, 10));

function createPool(overrides = {}) {
  return new Pool({
    ...env.db,
    connectionTimeoutMillis: 3000, // CSDL tắt -> báo lỗi sau 3 giây, không treo request
    ...overrides,
  });
}

module.exports = { createPool };
