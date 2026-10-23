// API4 – kiểm KIỂU và ĐỊNH DẠNG của query string; quy tắc (from ≤ to, QT-14...) nằm ở ResponseService.
const { ValidationError } = require('../errors/app-error');
const { parseId } = require('./common');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(value, field) {
  if (value === undefined || value === '') return undefined;
  const d = new Date(`${value}T00:00:00Z`);
  if (!DATE_RE.test(value) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) {
    throw new ValidationError(field, `${field} phải là ngày hợp lệ dạng YYYY-MM-DD`);
  }
  return value;
}
const optionalInt = (v, field) => (v === undefined || v === '' ? undefined : parseId(v, field));

function validateResponseQuery(q) {
  return {
    centerId: optionalInt(q.center_id, 'center_id'),
    from: parseDate(q.from, 'from'),
    to: parseDate(q.to, 'to'),
    csatMax: optionalInt(q.csat_max, 'csat_max'),
    page: optionalInt(q.page, 'page') ?? 1,
    pageSize: optionalInt(q.page_size, 'page_size') ?? 20,
  };
}

module.exports = { validateResponseQuery };
