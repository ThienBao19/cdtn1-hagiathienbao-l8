// API4 – danh sách phản hồi (M2).
import { apiRequest } from './client';

/** Một dòng trên M2 (đã che số điện thoại ở backend theo QT-15). */
const toResponseRow = (r) => ({
  id: r.response_id,
  ticketCode: r.ticket_code,
  centerName: r.center_name,
  customerName: r.customer_name,
  phone: r.phone,
  technicianName: r.technician_name, // null = phiếu chưa gán kỹ thuật viên
  csat: r.csat_score,
  nps: r.nps_score,                  // null = khách không chấm NPS
  comment: r.comment,
  needsCare: r.is_flagged,           // nhãn "Cần chăm sóc" (BR-L8-04)
  respondedAt: new Date(r.responded_at),
});

export async function listResponses({ from, to, csatMax, page, pageSize = 20 }) {
  const d = await apiRequest('/survey-responses', {
    auth: true,
    query: { from, to, csat_max: csatMax, page, page_size: pageSize },
  });
  return { total: d.total, page: d.page, pageSize: d.page_size, items: d.items.map(toResponseRow) };
}
