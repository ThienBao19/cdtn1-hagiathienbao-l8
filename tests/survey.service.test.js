// Kiểm thử SurveyService – BR-L8-01 (hạn 7 ngày), BR-L8-02 (miền điểm), BR-L8-05/NFR5 (1 phản hồi)
const { createSurveyService } = require('../src/backend/services/survey.service');
const { createFakeDb } = require('./fakes/in-memory-repositories');

const DAY = 24 * 60 * 60 * 1000;
const CREATED = new Date('2026-10-02T02:30:00Z');
const TOKEN = 'a'.repeat(64);

function setup(nowValue) {
  let now = nowValue;
  const fake = createFakeDb({ now: () => now });
  const ticket = fake.addTicket({ ticket_code: 'BH-000123/2026', status: 'DA_DONG' });
  fake.addInvitation(ticket, { token: TOKEN, created_at: CREATED });
  const service = createSurveyService({ ...fake, now: () => now, validDays: 7 });
  return { fake, service, setNow: (d) => { now = d; } };
}

describe('SurveyService.submitResponse – luồng đúng', () => {
  test('[Luồng đúng] AC2.1: CSAT 4, NPS 9 trong hạn -> lưu phản hồi, không gắn nhãn Cần chăm sóc', async () => {
    const { fake, service } = setup(new Date(CREATED.getTime() + DAY));

    const r = await service.submitResponse(TOKEN, { csat_score: 4, nps_score: 9, comment: '  Sửa nhanh.  ' });

    expect(r).toMatchObject({ ticket_code: 'BH-000123/2026', csat_score: 4, nps_score: 9, comment: 'Sửa nhanh.', is_flagged: false });
    expect(fake.db.responses).toHaveLength(1);
  });

  test('[Luồng đúng] BR-L8-04: CSAT 2 -> is_flagged = true (nhãn Cần chăm sóc)', async () => {
    const { service } = setup(new Date(CREATED.getTime() + DAY));
    const r = await service.submitResponse(TOKEN, { csat_score: 2 });
    expect(r.is_flagged).toBe(true);
    expect(r.nps_score).toBeNull();
  });
});

describe('Giá trị biên', () => {
  test('[Giá trị biên] BR-L8-01: đúng thời điểm hết hạn (tròn 7 ngày) còn nhận; trễ 1 ms thì hết hạn', async () => {
    const deadline = CREATED.getTime() + 7 * DAY;

    const late = setup(new Date(deadline + 1));
    await expect(late.service.submitResponse(TOKEN, { csat_score: 5 }))
      .rejects.toMatchObject({ code: 'INVITATION_EXPIRED', message: 'Link khảo sát đã hết hạn' });
    expect(late.fake.db.responses).toHaveLength(0);

    const onTime = setup(new Date(deadline));
    await expect(onTime.service.submitResponse(TOKEN, { csat_score: 5 })).resolves.toMatchObject({ csat_score: 5 });
  });

  test.each([
    [{ csat_score: 1 }, true], [{ csat_score: 5 }, true], [{ csat_score: 0 }, false], [{ csat_score: 6 }, false],
    [{ csat_score: 3, nps_score: 0 }, true], [{ csat_score: 3, nps_score: 10 }, true], [{ csat_score: 3, nps_score: 11 }, false],
    [{ csat_score: 3, comment: 'x'.repeat(500) }, true], [{ csat_score: 3, comment: 'x'.repeat(501) }, false],
  ])('[Giá trị biên] BR-L8-02: %o -> hợp lệ = %s', async (input, ok) => {
    const { service } = setup(new Date(CREATED.getTime() + DAY));
    const call = service.submitResponse(TOKEN, input);
    if (ok) await expect(call).resolves.toBeDefined();
    else await expect(call).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });
});

describe('Dữ liệu sai', () => {
  test('[Dữ liệu sai] AC2.4: chưa chọn CSAT -> từ chối, báo đúng trường csat_score', async () => {
    const { fake, service } = setup(new Date(CREATED.getTime() + DAY));
    await expect(service.submitResponse(TOKEN, { nps_score: 8 }))
      .rejects.toMatchObject({ code: 'VALIDATION_ERROR', field: 'csat_score', message: 'Vui lòng chọn mức hài lòng' });
    expect(fake.db.responses).toHaveLength(0);
  });

  test('[Dữ liệu sai] AC2.2 + NFR5: gửi lần 2 -> ALREADY_RESPONDED, vẫn chỉ 1 phản hồi', async () => {
    const { fake, service } = setup(new Date(CREATED.getTime() + DAY));
    await service.submitResponse(TOKEN, { csat_score: 4 });
    await expect(service.submitResponse(TOKEN, { csat_score: 1 }))
      .rejects.toMatchObject({ code: 'ALREADY_RESPONDED', details: { csat_score: 4 } });
    expect(fake.db.responses).toHaveLength(1);
  });

  test('[Dữ liệu sai] token không tồn tại -> INVITATION_NOT_FOUND', async () => {
    const { service } = setup(new Date(CREATED.getTime() + DAY));
    await expect(service.getSurvey('f'.repeat(64))).rejects.toMatchObject({ code: 'INVITATION_NOT_FOUND' });
  });
});
