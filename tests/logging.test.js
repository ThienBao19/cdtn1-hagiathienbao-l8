// Kiểm thử logger và middleware lỗi duy nhất (Buổi 11): ghi log MỘT lần, có requestId, che dữ liệu nhạy cảm,
// người dùng chỉ nhận thông báo chung kèm mã tra cứu – không lộ lỗi thô của thư viện.
const request = require('supertest');
const { createLogger } = require('../src/backend/logger');
const { createApp } = require('../src/backend/app');

function memoryLogger(level = 'debug') {
  const lines = [];
  return { lines, logger: createLogger({ level, write: (l) => lines.push(JSON.parse(l)) }) };
}

describe('logger', () => {
  test('[Luồng đúng] mỗi dòng có thời điểm, mức, mô tả và ngữ cảnh', () => {
    const { lines, logger } = memoryLogger();
    logger.info({ requestId: 'ab12cd34', ticketCode: 'BH-000106/2026' }, 'đã tạo lời mời khảo sát');
    expect(lines[0]).toMatchObject({ level: 'info', msg: 'đã tạo lời mời khảo sát', requestId: 'ab12cd34', ticketCode: 'BH-000106/2026' });
    expect(lines[0].time).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test('[Dữ liệu sai] mật khẩu, token, số điện thoại, Authorization bị che, kể cả lồng bên trong', () => {
    const { lines, logger } = memoryLogger();
    logger.warn({ password: 'Matkhau@123', token: 'abc', user: { phone: '0901234567', Authorization: 'Bearer x' } }, 'thử che');
    const text = JSON.stringify(lines[0]);
    expect(text).not.toMatch(/Matkhau@123|0901234567|Bearer x|"abc"/);
    expect(lines[0].user.phone).toBe('[ĐÃ CHE]');
  });

  test('[Giá trị biên] LOG_LEVEL = warn: bỏ qua info, vẫn ghi warn và error', () => {
    const { lines, logger } = memoryLogger('warn');
    logger.info({}, 'a'); logger.warn({}, 'b'); logger.error({}, 'c');
    expect(lines.map((l) => l.msg)).toEqual(['b', 'c']);
  });
});

describe('middleware lỗi', () => {
  function appThrowing(err) {
    const { lines, logger } = memoryLogger();
    const surveyService = { getSurvey: async () => { throw err; } };
    return { lines, app: createApp({ services: { surveyService }, db: {}, logger }) };
  }

  test('[Dữ liệu sai] CSDL tắt (ECONNREFUSED) -> 503 kèm mã tra cứu = X-Request-Id; ghi ĐÚNG MỘT dòng ERROR', async () => {
    const err = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5432'), { code: 'ECONNREFUSED' });
    const { app, lines } = appThrowing(err);
    const res = await request(app).get(`/api/surveys/${'a'.repeat(64)}`);
    const id = res.headers['x-request-id'];
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('DB_UNAVAILABLE');
    expect(res.body.error.message).toContain(`Mã tra cứu: ${id}`);
    expect(JSON.stringify(res.body)).not.toMatch(/ECONNREFUSED|5432/);
    expect(lines.filter((l) => l.level === 'error')).toHaveLength(1);
    expect(lines[0]).toMatchObject({ level: 'error', requestId: id });
  });

  test('[Dữ liệu sai] lỗi không lường trước -> 500 thông báo chung, không trả ngăn xếp hay câu lỗi gốc', async () => {
    const { app } = appThrowing(new TypeError("Cannot read properties of null (reading 'trim')"));
    const res = await request(app).get(`/api/surveys/${'a'.repeat(64)}`);
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(res.body)).not.toMatch(/trim|TypeError|stack/);
  });

  test('[Luồng đúng] lỗi nghiệp vụ (404 token không hợp lệ) chỉ ghi mức INFO, không ghi ERROR', async () => {
    const { lines, logger } = memoryLogger();
    const app = createApp({ services: { surveyService: {} }, db: {}, logger });
    const res = await request(app).get('/api/surveys/khong-hop-le');
    expect(res.status).toBe(404);
    expect(lines.map((l) => l.level)).toEqual(['info']);
  });
});
