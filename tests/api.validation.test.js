// Kiểm thử qua HTTP (Supertest) với repository giả: dữ liệu sai bị TỪ CHỐI rõ ràng, không sập (C7).
const request = require('supertest');
const { createApp } = require('../src/backend/app');
const { createFakeDb } = require('./fakes/in-memory-repositories');
const { createSurveyService } = require('../src/backend/services/survey.service');
const { createInvitationService } = require('../src/backend/services/invitation.service');
const { createCustomerService } = require('../src/backend/services/customer.service');

function buildApp() {
  const fake = createFakeDb();
  const ticket = fake.addTicket({ ticket_code: 'BH-000123/2026', status: 'DA_DONG' });
  fake.addInvitation(ticket, { token: 'a'.repeat(64), created_at: new Date() });
  const services = {
    surveyService: createSurveyService(fake),
    invitationService: createInvitationService(fake),
    customerService: createCustomerService(fake),
    technicianService: {},
  };
  return createApp({ services, db: { query: async () => ({ rows: [{}] }) } });
}

describe('API – dữ liệu sai trả 400 kèm tên trường', () => {
  test('[Dữ liệu sai] POST /api/surveys/{token}/responses thiếu csat_score -> 400, field = csat_score', async () => {
    const res = await request(buildApp()).post(`/api/surveys/${'a'.repeat(64)}/responses`).send({ nps_score: 9 });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: { code: 'VALIDATION_ERROR', message: 'Vui lòng chọn mức hài lòng', field: 'csat_score' } });
  });

  test('[Dữ liệu sai] body không phải JSON -> 400 INVALID_JSON, không trả lỗi thô', async () => {
    const res = await request(buildApp()).post('/api/customers').set('Content-Type', 'application/json').send('{"full_name": ');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });

  test('[Dữ liệu sai] POST /api/customers số điện thoại sai -> 400, field = phone', async () => {
    const res = await request(buildApp()).post('/api/customers').send({ full_name: 'A', phone: '12345' });
    expect(res.status).toBe(400);
    expect(res.body.error.field).toBe('phone');
  });

  test('[Dữ liệu sai] POST /api/survey-invitations sai định dạng mã phiếu -> 400, field = ticket_code', async () => {
    const res = await request(buildApp()).post('/api/survey-invitations').send({ ticket_code: 'BH-123' });
    expect(res.status).toBe(400);
    expect(res.body.error.field).toBe('ticket_code');
  });

  test('[Luồng đúng] API1 phiếu đã có lời mời -> 409 INVITATION_EXISTS', async () => {
    const res = await request(buildApp()).post('/api/survey-invitations').send({ ticket_code: 'BH-000123/2026' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVITATION_EXISTS');
  });
});
