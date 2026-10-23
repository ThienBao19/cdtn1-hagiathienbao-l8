// HỢP ĐỒNG DỮ LIỆU – MỘT PHẢN HỒI trong danh sách API4 (lớp nghiệp vụ -> lớp trình bày).
// Đây là chỗ DUY NHẤT đổi dòng CSDL thành dữ liệu trả ra, nên cũng là chỗ duy nhất áp dụng QT-15.
//   response_id     : số nguyên, luôn có
//   ticket_code     : chuỗi dạng BH-000123/2026, luôn có
//   center_name     : chuỗi, luôn có
//   customer_name   : chuỗi, luôn có
//   phone           : chuỗi 10 ký tự; dạng che 090****567 với mọi vai trò trừ QUAN_LY (QT-15, NFR4)
//   technician_name : chuỗi HOẶC null nếu phiếu chưa gán kỹ thuật viên
//   csat_score      : số nguyên 1–5, luôn có
//   nps_score       : số nguyên 0–10 HOẶC null (khách không chấm NPS – FR3 không bắt buộc)
//   comment         : chuỗi ≤ 500 ký tự HOẶC null
//   is_flagged      : boolean, true khi CSAT ≤ 2 – nhãn "Cần chăm sóc" (BR-L8-04), tính khi đọc
//   responded_at    : chuỗi ISO 8601 (UTC, có chữ Z)
const { maskPhone } = require('./customer.service');
const { isFlagged } = require('./survey.service');
const { ROLES } = require('./auth.service');

/**
 * Đổi một dòng truy vấn thành phần tử của danh sách phản hồi.
 * @param {object} row Dòng trả về từ ReportRepository.listResponses.
 * @param {string} role Vai trò người xem (NHAN_VIEN | QUAN_LY).
 */
function toResponseView(row, role) {
  return {
    response_id: row.response_id,
    ticket_code: row.ticket_code,
    center_name: row.center_name,
    customer_name: row.customer_name,
    phone: role === ROLES.QUAN_LY ? row.phone : maskPhone(row.phone),
    technician_name: row.technician_name ?? null,
    csat_score: row.csat_score,
    nps_score: row.nps_score ?? null,
    comment: row.comment ?? null,
    is_flagged: isFlagged(row.csat_score),
    responded_at: new Date(row.responded_at).toISOString(),
  };
}

module.exports = { toResponseView };
