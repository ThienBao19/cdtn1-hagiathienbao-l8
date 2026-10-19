// ResponseRepository – chỉ có INSERT và SELECT: phản hồi không sửa, không xoá (BR-L8-05).
const { runQuery } = require('./pg-helpers');

function createResponseRepository(db) {
  return {
    async insert({ invitation_id, csat_score, nps_score, comment }) {
      const { rows } = await runQuery(db,
        `INSERT INTO survey_response (invitation_id, csat_score, nps_score, comment)
         VALUES ($1, $2, $3, $4)
         RETURNING response_id, invitation_id, csat_score, nps_score, comment, responded_at`,
        [invitation_id, csat_score, nps_score, comment]);
      return rows[0];
    },
  };
}

module.exports = { createResponseRepository };
