// Repository giả lưu trong bộ nhớ – kiểm thử tự dựng dữ liệu, KHÔNG cần PostgreSQL trên máy chấm.
// Giao diện (tên hàm, dữ liệu trả về) giống hệt repository thật trong src/backend/repositories/.
const { DuplicateKeyError } = require('../../src/backend/errors/app-error');

function createFakeDb({ now = () => new Date() } = {}) {
  const db = {
    centers: [{ center_id: 1, center_name: 'Trung tâm bảo hành Quận 10' }],
    tickets: [],
    invitations: [],
    responses: [],
    customers: [],
    technicians: [],
  };
  let seq = 100;
  const nextId = () => ++seq;

  const ticketRepository = {
    async findByCode(code) { return db.tickets.find((t) => t.ticket_code === code) || null; },
  };

  const invitationRepository = {
    async findByTicketId(id) { return db.invitations.find((i) => i.ticket_id === id) || null; },
    async insert({ ticket_id, token }) {
      if (db.invitations.some((i) => i.ticket_id === ticket_id)) throw new DuplicateKeyError('survey_invitation_ticket_id_key');
      const row = { invitation_id: nextId(), ticket_id, token, created_at: now() };
      db.invitations.push(row);
      return row;
    },
    async findSurveyByToken(token) {
      const inv = db.invitations.find((i) => i.token === token);
      if (!inv) return null;
      const t = db.tickets.find((x) => x.ticket_id === inv.ticket_id);
      const c = db.centers.find((x) => x.center_id === t.center_id);
      const r = db.responses.find((x) => x.invitation_id === inv.invitation_id);
      return {
        invitation_id: inv.invitation_id, token: inv.token, created_at: inv.created_at,
        ticket_code: t.ticket_code, device_model: t.device_model, closed_at: t.closed_at, center_name: c.center_name,
        response_id: r ? r.response_id : null, csat_score: r ? r.csat_score : null,
        nps_score: r ? r.nps_score : null, responded_at: r ? r.responded_at : null,
      };
    },
  };

  const responseRepository = {
    async insert(data) {
      if (db.responses.some((r) => r.invitation_id === data.invitation_id)) throw new DuplicateKeyError('survey_response_invitation_id_key');
      const row = { response_id: nextId(), ...data, responded_at: now() };
      db.responses.push(row);
      return row;
    },
  };

  const customerRepository = {
    async findAll({ includeInactive }) { return db.customers.filter((c) => includeInactive || c.is_active); },
    async findById(id) { return db.customers.find((c) => c.customer_id === id) || null; },
    async findByPhone(phone) { return db.customers.find((c) => c.phone === phone) || null; },
    async insert({ full_name, phone }) {
      if (db.customers.some((c) => c.phone === phone)) throw new DuplicateKeyError('customer_phone_key');
      const row = { customer_id: nextId(), full_name, phone, is_active: true, created_at: now() };
      db.customers.push(row);
      return row;
    },
    async update(id, data) { const c = await this.findById(id); if (!c) return null; Object.assign(c, data); return c; },
    async setActive(id, v) { const c = await this.findById(id); if (!c) return null; c.is_active = v; return c; },
  };

  // Hàm tiện ích để test tự dựng dữ liệu cần dùng.
  function addTicket(fields) {
    const row = { ticket_id: nextId(), center_id: 1, device_model: 'iPhone 13 128GB', closed_at: now(), ...fields };
    db.tickets.push(row);
    return row;
  }
  function addInvitation(ticket, { token, created_at }) {
    const row = { invitation_id: nextId(), ticket_id: ticket.ticket_id, token, created_at };
    db.invitations.push(row);
    return row;
  }

  return { db, ticketRepository, invitationRepository, responseRepository, customerRepository, addTicket, addInvitation };
}

module.exports = { createFakeDb };
