// API2, API3 – trang khảo sát của khách (M1). Hàm chuyển đổi ở ranh giới: snake_case (API) -> camelCase (giao diện).
import { apiRequest } from './client';

/** Hợp đồng trang khảo sát: ticketCode, centerName, deviceModel, closedAt (Date), expiresAt (Date). */
const toSurveyView = (d) => ({
  ticketCode: d.ticket_code,
  centerName: d.center_name,
  deviceModel: d.device_model,
  closedAt: d.closed_at ? new Date(d.closed_at) : null,
  expiresAt: new Date(d.expires_at),
});

export const getSurvey = async (token) => toSurveyView(await apiRequest(`/surveys/${encodeURIComponent(token)}`));

/**
 * Gửi phản hồi. npsScore, comment không bắt buộc (FR3, FR4).
 * @returns {Promise<{ticketCode: string, csatScore: number, isFlagged: boolean}>}
 */
export async function submitResponse(token, { csatScore, npsScore, comment }) {
  const d = await apiRequest(`/surveys/${encodeURIComponent(token)}/responses`, {
    method: 'POST',
    body: { csat_score: csatScore, nps_score: npsScore ?? null, comment: comment?.trim() ? comment.trim() : null },
  });
  return { ticketCode: d.ticket_code, csatScore: d.csat_score, isFlagged: d.is_flagged };
}
