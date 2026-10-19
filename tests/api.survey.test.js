// Kiểm thử API3 qua HTTP theo góp ý GV cho BT2: AC2.1–AC2.4, gửi trùng (409), hết hạn (410)
// – làm trước khi có giao diện M1. Dùng repository giả, đồng hồ giả để điều khiển thời gian.
const request = require('supertest');
const { createApp } = require('../src/backend/app');
const { createFakeDb } = require('./fakes/in-memory-repositories');
const { createSurveyService } = require('../src/backend/services/survey.service');

const DAY = 24 * 60 * 60 * 1000;
const CREATED = new Date('2026-10-02T02:30:00Z');
const OPEN = 'a'.repeat(64);    // lời mời còn hạn
const EXPIRED = 'b'.repeat(64); // lời mời tạo 8 ngày trước thời điểm "now"

function buildApp(now = new Date(CREATED.getTime() + DAY)) {
  const fake = createFakeDb({ now: () => now });
  const t1 = fake.addTicket({ ticket_code: 'BH-000123/2026', status: 'DA_DONG' });
  const t2 = fake.addTicket({ ticket_code: 'BH-000124/2026', status: 'DA_DONG' });
  fake.addInvitation(t1, { token: OPEN, created_at: CREATED });
  fake.addInvitation(t2, { token: EXPIRED, created_at: new Date(now.getTime() - 8 * DAY) });
  const services = { surveyService: createSurveyService({ ...fake, now: () => now }) };
  return { app: createApp({ services, db: {} }), fake };
}

const post = (app, token, body) => request(app).post(`/api/surveys/${token}/responses`).send(body);

describe('API3 POST /api/surveys/{token}/responses', () => {
  test('[Luồng đúng] AC2.1: CSAT 4 trong hạn -> 201, lưu 1 phản hồi, lời mời thành Đã trả lời', async () => {
    const { app, fake } = buildApp();
    const res = await post(app, OPEN, { csat_score: 4 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ ticket_code: 'BH-000123/2026', csat_score: 4, is_flagged: false });
    expect(fake.db.responses).toHaveLength(1);
  });

  test('[Dữ liệu sai] AC2.2: gửi trùng lần 2 -> 409 ALREADY_RESPONDED kèm điểm đã chấm, không tạo phản hồi thứ 2', async () => {
    const { app, fake } = buildApp();
    await post(app, OPEN, { csat_score: 4, nps_score: 9 });
    const res = await post(app, OPEN, { csat_score: 1 });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ code: 'ALREADY_RESPONDED', details: { csat_score: 4, nps_score: 9 } });
    expect(fake.db.responses).toHaveLength(1);
  });

  test('[Dữ liệu sai] AC2.2: mở lại link đã trả lời (API2) -> 409', async () => {
    const { app } = buildApp();
    await post(app, OPEN, { csat_score: 4 });
    const res = await request(app).get(`/api/surveys/${OPEN}`);
    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe('Bạn đã gửi đánh giá cho phiếu này');
  });

  test('[Dữ liệu sai] AC2.3: lời mời quá hạn 7 ngày -> 410 INVITATION_EXPIRED ở cả API2 và API3', async () => {
    const { app, fake } = buildApp();
    const open = await request(app).get(`/api/surveys/${EXPIRED}`);
    const send = await post(app, EXPIRED, { csat_score: 5 });
    expect(open.status).toBe(410);
    expect(send.status).toBe(410);
    expect(send.body.error).toEqual({ code: 'INVITATION_EXPIRED', message: 'Link khảo sát đã hết hạn' });
    expect(fake.db.responses).toHaveLength(0);
  });

  test('[Giá trị biên] AC2.3: tròn 7 ngày còn nhận (201), trễ 1 ms -> 410', async () => {
    const deadline = CREATED.getTime() + 7 * DAY;
    expect((await post(buildApp(new Date(deadline)).app, OPEN, { csat_score: 3 })).status).toBe(201);
    expect((await post(buildApp(new Date(deadline + 1)).app, OPEN, { csat_score: 3 })).status).toBe(410);
  });

  test('[Dữ liệu sai] AC2.4: chưa chọn CSAT -> 400 "Vui lòng chọn mức hài lòng", không lưu gì', async () => {
    const { app, fake } = buildApp();
    const res = await post(app, OPEN, { nps_score: 8, comment: 'Ổn' });
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual({ code: 'VALIDATION_ERROR', message: 'Vui lòng chọn mức hài lòng', field: 'csat_score' });
    expect(fake.db.responses).toHaveLength(0);
  });

  test('[Dữ liệu sai] token không tồn tại -> 404 "Link khảo sát không hợp lệ"', async () => {
    const { app } = buildApp();
    const res = await post(app, 'f'.repeat(64), { csat_score: 4 });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('INVITATION_NOT_FOUND');
  });
});
