// Tầng kiểm thứ nhất: kiểu và định dạng dữ liệu vào (chưa phải quy tắc nghiệp vụ).
const { ValidationError } = require('../errors/app-error');

function requireBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('body', 'Body phải là một đối tượng JSON');
  }
  return body;
}

function parseId(value, field = 'id') {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0 || String(value).trim() !== String(n)) {
    throw new ValidationError(field, `${field} phải là số nguyên dương`);
  }
  return n;
}

function requireString(body, field, { max }) {
  const v = body[field];
  if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) {
    throw new ValidationError(field, `Thiếu trường bắt buộc: ${field}`);
  }
  if (typeof v !== 'string') throw new ValidationError(field, `${field} phải là chuỗi`);
  const s = v.trim();
  if (s.length > max) throw new ValidationError(field, `${field} tối đa ${max} ký tự`);
  return s;
}

function parseBool(value) {
  return value === 'true' || value === '1';
}

module.exports = { requireBody, parseId, requireString, parseBool };
