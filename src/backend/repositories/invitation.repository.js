// InvitationRepository – SQL cho bảng survey_invitation.
const { runQuery } = require('./pg-helpers');

function createInvitationRepository(db) {
  return {
    async findByTicketId(ticketId) {
      const { rows } = await runQuery(db,
        'SELECT invitation_id, ticket_id, token, created_at FROM survey_invitation WHERE ticket_id = $1', [ticketId]);
      return rows[0] || null;
    },
    async insert({ ticket_id, token }) {
      const { rows } = await runQuery(db,
        'INSERT INTO survey_invitation (ticket_id, token) VALUES ($1, $2) RETURNING invitation_id, ticket_id, token, created_at',
        [ticket_id, token]);
      return rows[0];
    },
    // Dữ liệu cho trang khảo sát (API2): lời mời + phiếu + trung tâm + phản hồi (nếu đã có).
    async findSurveyByToken(token) {
      const { rows } = await runQuery(db,
        `SELECT i.invitation_id, i.token, i.created_at,
                t.ticket_code, t.device_model, t.closed_at,
                c.center_name,
                r.response_id, r.csat_score, r.nps_score, r.responded_at
         FROM survey_invitation i
         JOIN ticket t          ON t.ticket_id = i.ticket_id
         JOIN service_center c  ON c.center_id = t.center_id
         LEFT JOIN survey_response r ON r.invitation_id = i.invitation_id
         WHERE i.token = $1`, [token]);
      return rows[0] || null;
    },
  };
}

module.exports = { createInvitationRepository };
