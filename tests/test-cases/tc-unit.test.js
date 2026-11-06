// Test Report BT3 – tầng UNIT (TC-01 … TC-07): service tách khỏi CSDL bằng repository giả, đồng hồ cố định.
// Mỗi test mang đúng mã TC trong docs/test-report.md; chạy riêng một test: npx jest -t "TC-05"
const { createFakeDb } = require('../fakes/in-memory-repositories');
const { createInvitationService } = require('../../src/backend/services/invitation.service');
const { createSurveyService } = require('../../src/backend/services/survey.service');
const { computeMetrics } = require('../../src/backend/services/report.service');

const DAY = 24 * 60 * 60 * 1000;
const CREATED = new Date('2026-10-02T02:30:00Z'); // lời mời tạo lúc 09:30 ngày 02/10/2026 giờ Việt Nam
const TOKEN = 'a'.repeat(64);

/** Tiền điều kiện chung: phiếu BH-000123/2026 Đã đóng, có 1 lời mời tạo lúc CREATED, chưa có phản hồi. */
function surveyAt(now) {
  const fake = createFakeDb({ now: () => now });
  const ticket = fake.addTicket({ ticket_code: 'BH-000123/2026', status: 'DA_DONG' });
  fake.addInvitation(ticket, { token: TOKEN, created_at: CREATED });
  return { fake, service: createSurveyService({ ...fake, now: () => now }) };
}

describe('Unit – InvitationService, SurveyService, ReportService', () => {
  test('TC-01 [Luồng đúng] QT-10, BR-L8-01: phiếu Đã đóng -> 1 lời mời, mã 64 ký tự hex, hạn = tạo + 7 ngày', async () => {
    const fake = createFakeDb({ now: () => CREATED });
    fake.addTicket({ ticket_code: 'BH-000123/2026', status: 'DA_DONG' });
    const service = createInvitationService({ ...fake, now: () => CREATED });
    const before = fake.db.invitations.length;

    const inv = await service.createForTicket('BH-000123/2026');

    expect(inv.token).toMatch(/^[0-9a-f]{64}$/);
    expect(inv.status).toBe('CHO_TRA_LOI');
    expect(inv.expires_at).toBe('2026-10-09T02:30:00.000Z'); // tính tay: 02/10 02:30Z + 7 ngày
    expect(inv.survey_url).toBe(`http://localhost:5173/khao-sat/${inv.token}`);
    expect([before, fake.db.invitations.length]).toEqual([0, 1]);
  });

  test('TC-02 [Giá trị biên] BR-L8-01: gửi ĐÚNG thời điểm hết hạn (tạo + 7 ngày) -> vẫn nhận phản hồi', async () => {
    const { fake, service } = surveyAt(new Date(CREATED.getTime() + 7 * DAY)); // 2026-10-09T02:30:00.000Z
    const saved = await service.submitResponse(TOKEN, { csat_score: 4, nps_score: 8 });
    expect(saved).toMatchObject({ ticket_code: 'BH-000123/2026', csat_score: 4, nps_score: 8, is_flagged: false });
    expect(fake.db.responses).toHaveLength(1);
  });

  test('TC-03 [Giá trị biên] BR-L8-01: trễ 1 ms sau hạn -> INVITATION_EXPIRED, không lưu phản hồi', async () => {
    const { fake, service } = surveyAt(new Date(CREATED.getTime() + 7 * DAY + 1)); // 2026-10-09T02:30:00.001Z
    await expect(service.submitResponse(TOKEN, { csat_score: 4, nps_score: 8 }))
      .rejects.toMatchObject({ code: 'INVITATION_EXPIRED', message: 'Link khảo sát đã hết hạn' });
    expect(fake.db.responses).toHaveLength(0);
  });

  test('TC-04 [Luồng đúng] BR-L8-04: CSAT 2 -> nhãn "Cần chăm sóc" (is_flagged), CSAT 3 -> không', async () => {
    const now = new Date(CREATED.getTime() + DAY);
    const fake = createFakeDb({ now: () => now });
    const t1 = fake.addTicket({ ticket_code: 'BH-000123/2026', status: 'DA_DONG' });
    const t2 = fake.addTicket({ ticket_code: 'BH-000124/2026', status: 'DA_DONG' });
    fake.addInvitation(t1, { token: 'a'.repeat(64), created_at: CREATED });
    fake.addInvitation(t2, { token: 'b'.repeat(64), created_at: CREATED });
    const service = createSurveyService({ ...fake, now: () => now });

    const r2 = await service.submitResponse('a'.repeat(64), { csat_score: 2, comment: 'Sửa lâu, không báo trước' });
    const r3 = await service.submitResponse('b'.repeat(64), { csat_score: 3 });

    expect([r2.is_flagged, r3.is_flagged]).toEqual([true, false]);
  });

  test('TC-05 [Luồng đúng] BR-L8-03: CSAT TB, tỉ lệ CSAT 4–5 và NPS khớp số tính tay', () => {
    // 10 phản hồi: CSAT 5,5,4,4,4,3,3,2,1,5 (tổng 36, có 6 phản hồi 4–5)
    // NPS 10,9,9,10,8,7,6,3,8 và 1 phản hồi bỏ trống NPS -> 9 có NPS: 4 promoter (9–10), 2 detractor (0–6)
    const m = computeMetrics({ n: 10, csat_sum: 36, csat_good: 6, nps_n: 9, promoters: 4, detractors: 2 });
    // Tính tay: 36/10 = 3,6 · 6/10 = 60,0% · (4 − 2)/9 × 100 = 22,2 -> 22
    expect(m).toEqual({ responses: 10, csat_avg: 3.6, csat_rate: 60, nps: 22, nps_responses: 9 });
    // Không có phản hồi -> null, KHÔNG phải 0 (api-contract mục 5)
    expect(computeMetrics({})).toEqual({ responses: 0, csat_avg: null, csat_rate: null, nps: null, nps_responses: 0 });
  });

  test('TC-06 [Giá trị biên] BR-L8-03: NPS đúng nửa đơn vị làm tròn đối xứng: +12,5 -> 13 và −12,5 -> −13', () => {
    // 8 phản hồi có NPS. Bên dương: 3 promoter, 2 detractor -> (3 − 2)/8 × 100 = +12,5
    const pos = computeMetrics({ n: 8, csat_sum: 28, csat_good: 4, nps_n: 8, promoters: 3, detractors: 2 });
    // Bên âm: 2 promoter, 3 detractor -> (2 − 3)/8 × 100 = −12,5
    const neg = computeMetrics({ n: 8, csat_sum: 28, csat_good: 4, nps_n: 8, promoters: 2, detractors: 3 });
    expect([pos.nps, neg.nps]).toEqual([13, -13]);
  });

  test('TC-07 [Giá trị biên] BR-L8-02: nhận xét đúng 500 ký tự (có emoji) được nhận; 501 ký tự -> 400 field comment', async () => {
    const at500 = 'Rất hài lòng '.repeat(10) + '👍'.repeat(370); // 130 + 370 = 500 ký tự (emoji 👍 = 1 ký tự)
    const at501 = at500 + '!';
    expect([...at500]).toHaveLength(500);

    const ok = surveyAt(new Date(CREATED.getTime() + DAY));
    const saved = await ok.service.submitResponse(TOKEN, { csat_score: 5, comment: at500 });
    expect([...saved.comment]).toHaveLength(500);
    expect(ok.fake.db.responses).toHaveLength(1);

    const bad = surveyAt(new Date(CREATED.getTime() + DAY));
    await expect(bad.service.submitResponse(TOKEN, { csat_score: 5, comment: at501 }))
      .rejects.toMatchObject({ code: 'VALIDATION_ERROR', field: 'comment', message: 'Nhận xét tối đa 500 ký tự (hiện có 501)' });
    expect(bad.fake.db.responses).toHaveLength(0);
  });
});
