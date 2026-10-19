// TicketRepository – L8 chỉ ĐỌC phiếu bảo hành (dữ liệu của L2/L4).
const { runQuery } = require('./pg-helpers');

function createTicketRepository(db) {
  return {
    async findByCode(ticketCode) {
      const { rows } = await runQuery(db,
        `SELECT ticket_id, ticket_code, center_id, technician_id, customer_id, device_model, status, received_at, closed_at
         FROM ticket WHERE ticket_code = $1`, [ticketCode]);
      return rows[0] || null;
    },
  };
}

module.exports = { createTicketRepository };
