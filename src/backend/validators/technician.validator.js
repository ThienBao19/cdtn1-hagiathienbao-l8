const { ValidationError } = require('../errors/app-error');
const { requireBody, requireString, parseId } = require('./common');

const LEVELS = ['SO_CAP', 'TRUNG_CAP', 'CAO_CAP']; // khớp CHECK của bảng technician

function validateTechnicianBody(raw) {
  const body = requireBody(raw);
  if (body.center_id === undefined || body.center_id === null) {
    throw new ValidationError('center_id', 'Thiếu trường bắt buộc: center_id');
  }
  const center_id = parseId(body.center_id, 'center_id');
  const full_name = requireString(body, 'full_name', { max: 120 });
  const level = requireString(body, 'level', { max: 10 });
  if (!LEVELS.includes(level)) {
    throw new ValidationError('level', `level phải là một trong ${LEVELS.join(', ')}`);
  }
  return { center_id, full_name, level };
}

module.exports = { validateTechnicianBody, LEVELS };
