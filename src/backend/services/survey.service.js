// SurveyService – khách mở link và gửi phản hồi khảo sát (US2–US4, FR2–FR4, UC2).
//  • BR-L8-01: lời mời hết hạn sau 7 ngày, lời mời hết hạn không nhận phản hồi.
//  • BR-L8-02: CSAT bắt buộc 1–5; NPS không bắt buộc 0–10; nhận xét không bắt buộc, ≤ 500 ký tự.
//  • BR-L8-05 + NFR5: mỗi lời mời chỉ một phản hồi, không sửa phản hồi đã gửi.
//  • BR-L8-04: is_flagged (nhãn "Cần chăm sóc") = CSAT ≤ 2, tính khi đọc.
const { AppError, ValidationError, DuplicateKeyError } = require('../errors/app-error');
const { computeInvitationStatus, expiresAt, STATUS } = require('./invitation.service');

const COMMENT_MAX = 500;
const FLAG_CSAT_MAX = 2;

const isFlagged = (csatScore) => csatScore <= FLAG_CSAT_MAX;

// BR-L8-02 – kiểm miền giá trị; trả về dữ liệu đã chuẩn hoá để lưu.
function validateResponseInput({ csat_score, nps_score, comment }) {
  if (csat_score === undefined || csat_score === null) {
    throw new ValidationError('csat_score', 'Vui lòng chọn mức hài lòng');
  }
  if (!Number.isInteger(csat_score) || csat_score < 1 || csat_score > 5) {
    throw new ValidationError('csat_score', 'Điểm CSAT phải là số nguyên từ 1 đến 5');
  }
  const nps = nps_score === undefined ? null : nps_score;
  if (nps !== null && (!Number.isInteger(nps) || nps < 0 || nps > 10)) {
    throw new ValidationError('nps_score', 'Điểm NPS phải là số nguyên từ 0 đến 10');
  }
  let text = comment === undefined || comment === null ? null : String(comment).trim();
  if (text !== null && text.length > COMMENT_MAX) {
    throw new ValidationError('comment', `Nhận xét tối đa ${COMMENT_MAX} ký tự (hiện có ${text.length})`);
  }
  if (text === '') text = null;
  return { csat_score, nps_score: nps, comment: text };
}

function createSurveyService({ invitationRepository, responseRepository, now = () => new Date(), validDays = 7 }) {
  // Tìm lời mời và kiểm lời mời còn nhận phản hồi được hay không.
  async function loadOpenInvitation(token) {
    const row = await invitationRepository.findSurveyByToken(token);
    if (!row) throw new AppError('INVITATION_NOT_FOUND', 'Link khảo sát không hợp lệ');
    const status = computeInvitationStatus({
      createdAt: row.created_at, hasResponse: row.response_id != null, now: now(), validDays,
    });
    if (status === STATUS.DA_TRA_LOI) {
      throw new AppError('ALREADY_RESPONDED', 'Bạn đã gửi đánh giá cho phiếu này', {
        csat_score: row.csat_score, nps_score: row.nps_score, responded_at: row.responded_at,
      });
    }
    if (status === STATUS.HET_HAN) throw new AppError('INVITATION_EXPIRED', 'Link khảo sát đã hết hạn');
    return { row, status };
  }

  return {
    async getSurvey(token) {
      const { row, status } = await loadOpenInvitation(token);
      return {
        ticket_code: row.ticket_code,
        center_name: row.center_name,
        device_model: row.device_model,
        closed_at: row.closed_at,
        status,
        expires_at: expiresAt(row.created_at, validDays).toISOString(),
      };
    },

    async submitResponse(token, input) {
      const data = validateResponseInput(input);
      const { row } = await loadOpenInvitation(token);
      let saved;
      try {
        saved = await responseRepository.insert({ invitation_id: row.invitation_id, ...data });
      } catch (err) {
        // Khách bấm Gửi 2 lần / mạng gửi lặp: UNIQUE(invitation_id) chặn phản hồi thứ hai (NFR5).
        if (err instanceof DuplicateKeyError) throw new AppError('ALREADY_RESPONDED', 'Bạn đã gửi đánh giá cho phiếu này');
        throw err;
      }
      return {
        response_id: saved.response_id,
        ticket_code: row.ticket_code,
        csat_score: saved.csat_score,
        nps_score: saved.nps_score,
        comment: saved.comment,
        is_flagged: isFlagged(saved.csat_score),
        responded_at: saved.responded_at,
      };
    },
  };
}

module.exports = { createSurveyService, validateResponseInput, isFlagged, COMMENT_MAX };
