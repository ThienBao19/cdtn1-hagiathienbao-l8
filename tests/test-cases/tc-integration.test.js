// Test Report BT3 – tầng INTEGRATION (TC-09, TC-12): service + repository THẬT + PostgreSQL thật.
// Cần PostgreSQL đang chạy với thông tin trong .env; test dùng CSDL riêng smartcrm_test (DB_NAME_TEST),
// tự tạo, tự xoá sạch trước mỗi test – không bao giờ chạm vào CSDL smartcrm.
// Hai TC nằm chung một tệp để chạy tuần tự (Jest chạy các tệp song song).
const db = require('../helpers/test-db'); // PHẢI đứng đầu: đổi DB_NAME sang CSDL thử trước khi nạp backend
const { buildServices } = require('../../src/backend/container');

const TOKEN = 'c'.repeat(64);
jest.setTimeout(60000);

let pool;
beforeEach(async () => { await db.resetDb(); pool = db.createPool(); });
afterEach(async () => { if (pool) await pool.end(); pool = undefined; });

describe('Integration – PostgreSQL thật (CSDL smartcrm_test)', () => {
  test('TC-09 [Dữ liệu sai] BR-L8-05, NFR5: hai lần gửi CÙNG LÚC cho một lời mời -> đúng 1 phản hồi được lưu, lần kia 409 ALREADY_RESPONDED', async () => {
    await db.seedOneInvitation(pool, TOKEN);
    const { surveyService } = buildServices(pool);
    const before = (await db.countRows(pool)).survey_response;

    // Khách bấm Gửi hai lần liên tiếp (hai yêu cầu song song, cùng vượt qua bước kiểm "đã trả lời chưa")
    const results = await Promise.allSettled([
      surveyService.submitResponse(TOKEN, { csat_score: 5, nps_score: 9, comment: 'Lần 1' }),
      surveyService.submitResponse(TOKEN, { csat_score: 1, nps_score: 0, comment: 'Lần 2' }),
    ]);

    const ok = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect([ok.length, rejected.length]).toEqual([1, 1]);
    expect(rejected[0].reason.code).toBe('ALREADY_RESPONDED');

    const { rows } = await pool.query('SELECT csat_score, comment FROM survey_response WHERE invitation_id = 1');
    expect([before, rows.length]).toEqual([0, 1]);
    expect(rows[0]).toEqual({ csat_score: ok[0].value.csat_score, comment: ok[0].value.comment });

    // Gửi lại lần 3 sau khi đã có phản hồi -> vẫn 409, bảng không đổi
    await expect(surveyService.submitResponse(TOKEN, { csat_score: 3 })).rejects.toMatchObject({ code: 'ALREADY_RESPONDED' });
    expect((await db.countRows(pool)).survey_response).toBe(1);
  });

  test('TC-12 [Tái lập] C8: chạy migrate + seed lần hai không lỗi, số dòng mọi bảng không đổi', async () => {
    await db.quietly(() => db.seed());
    const first = await db.countRows(pool);

    await db.quietly(async () => { await db.migrate(); await db.seed(); });
    const second = await db.countRows(pool);

    expect(second).toEqual(first);
    // Số dòng mong đợi theo README mục 3 (seed 001 + 002 + 003): 6 trung tâm, 24 KTV, 2.409 phiếu, 2.230 lời mời, 1.476 phản hồi
    expect(first).toEqual({
      service_center: 6, technician: 24, customer: 1206, ticket: 2409,
      survey_invitation: 2230, survey_response: 1476, app_user: 4, schema_migrations: 2,
    });
  });
});
