// ReportRepository – truy vấn danh sách phản hồi (API4) và số đếm tổng hợp cho báo cáo (US6, US7).
// Chỉ trả SỐ ĐẾM thô; công thức tỉ lệ CSAT, chỉ số NPS (BR-L8-03) nằm ở ReportService.
const { runQuery } = require('./pg-helpers');

// Các cột đếm dùng chung cho mọi truy vấn tổng hợp
const COUNTS = `COUNT(r.response_id)::int                                   AS n,
                COALESCE(SUM(r.csat_score), 0)::int                         AS csat_sum,
                COUNT(r.response_id) FILTER (WHERE r.csat_score >= 4)::int  AS csat_good,
                COUNT(r.nps_score)::int                                     AS nps_n,
                COUNT(r.response_id) FILTER (WHERE r.nps_score >= 9)::int   AS promoters,
                COUNT(r.response_id) FILTER (WHERE r.nps_score <= 6)::int   AS detractors`;

const FROM_RESPONSES = `FROM survey_response r
  JOIN survey_invitation i ON i.invitation_id = r.invitation_id
  JOIN ticket t            ON t.ticket_id = i.ticket_id`;

function createReportRepository(db) {
  return {
    /** Danh sách phản hồi đã lọc, mới nhất trước (AC5.1). from/to là mốc thời gian [from, to). */
    async listResponses({ centerId, from, to, csatMax, limit, offset }) {
      const params = [centerId, from, to, csatMax];
      const where = `WHERE t.center_id = $1
          AND ($2::timestamptz IS NULL OR r.responded_at >= $2)
          AND ($3::timestamptz IS NULL OR r.responded_at <  $3)
          AND ($4::int IS NULL OR r.csat_score <= $4)`;
      const { rows: [{ total }] } = await runQuery(db, `SELECT COUNT(*)::int AS total ${FROM_RESPONSES} ${where}`, params);
      const { rows } = await runQuery(db,
        `SELECT r.response_id, t.ticket_code, c.center_name, cu.full_name AS customer_name, cu.phone,
                tc.full_name AS technician_name, r.csat_score, r.nps_score, r.comment, r.responded_at
         ${FROM_RESPONSES}
         JOIN service_center c ON c.center_id = t.center_id
         JOIN customer cu      ON cu.customer_id = t.customer_id
         LEFT JOIN technician tc ON tc.technician_id = t.technician_id
         ${where}
         ORDER BY r.responded_at DESC, r.response_id DESC
         LIMIT $5 OFFSET $6`, [...params, limit, offset]);
      return { total, rows };
    },

    /** Số đếm theo từng kỹ thuật viên của trung tâm trong [from, to); KTV chưa có phản hồi vẫn có dòng n = 0. */
    async countsByTechnician({ centerId, from, to }) {
      const { rows } = await runQuery(db,
        `SELECT tc.technician_id, tc.full_name AS technician_name, tc.level, tc.is_active, ${COUNTS}
         FROM technician tc
         LEFT JOIN ticket t            ON t.technician_id = tc.technician_id
         LEFT JOIN survey_invitation i ON i.ticket_id = t.ticket_id
         LEFT JOIN survey_response r   ON r.invitation_id = i.invitation_id
                                      AND r.responded_at >= $2 AND r.responded_at < $3
         WHERE tc.center_id = $1
         GROUP BY tc.technician_id, tc.full_name, tc.level, tc.is_active
         ORDER BY tc.technician_id`, [centerId, from, to]);
      return rows;
    },

    /** Số đếm theo tháng (giờ Việt Nam) trong [from, to); centerId = null nghĩa là toàn hệ thống. */
    async countsByMonth({ centerId, from, to }) {
      const { rows } = await runQuery(db,
        `SELECT to_char(r.responded_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM') AS month, ${COUNTS}
         ${FROM_RESPONSES}
         WHERE ($1::int IS NULL OR t.center_id = $1)
           AND r.responded_at >= $2 AND r.responded_at < $3
         GROUP BY 1 ORDER BY 1`, [centerId, from, to]);
      return rows;
    },
  };
}

module.exports = { createReportRepository };
