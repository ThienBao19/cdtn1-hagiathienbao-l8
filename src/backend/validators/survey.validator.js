const { AppError, ValidationError } = require('../errors/app-error');
const { requireBody, requireString } = require('./common');

const TICKET_CODE_RE = /^BH-[0-9]{6}\/[0-9]{4}$/;
const TOKEN_RE = /^[0-9a-f]{64}$/;

function validateInvitationBody(raw) {
  const body = requireBody(raw);
  const ticket_code = requireString(body, 'ticket_code', { max: 20 });
  if (!TICKET_CODE_RE.test(ticket_code)) {
    throw new ValidationError('ticket_code', 'ticket_code phải có dạng BH-xxxxxx/yyyy, ví dụ BH-000123/2026');
  }
  return { ticket_code };
}

// Token sai định dạng được coi như không tồn tại (API2/API3 chỉ định nghĩa 404 cho trường hợp này).
function validateToken(token) {
  if (!TOKEN_RE.test(String(token || ''))) throw new AppError('INVITATION_NOT_FOUND', 'Link khảo sát không hợp lệ');
  return token;
}

// Chỉ kiểm KIỂU; miền giá trị (1–5, 0–10, ≤ 500) là quy tắc BR-L8-02 nằm ở SurveyService.
function validateResponseBody(raw) {
  const body = requireBody(raw);
  const { csat_score, nps_score, comment } = body;
  if (csat_score !== undefined && csat_score !== null && typeof csat_score !== 'number') {
    throw new ValidationError('csat_score', 'Điểm CSAT phải là số nguyên từ 1 đến 5');
  }
  if (nps_score !== undefined && nps_score !== null && typeof nps_score !== 'number') {
    throw new ValidationError('nps_score', 'Điểm NPS phải là số nguyên từ 0 đến 10');
  }
  if (comment !== undefined && comment !== null && typeof comment !== 'string') {
    throw new ValidationError('comment', 'Nhận xét phải là chuỗi');
  }
  return { csat_score, nps_score, comment };
}

module.exports = { validateInvitationBody, validateToken, validateResponseBody };
