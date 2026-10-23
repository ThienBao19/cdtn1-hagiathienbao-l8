// Kiểm thử AuthService + API4 qua HTTP: đăng nhập, 401 khi thiếu/sai token (Buổi 9: 401 -> frontend xoá token)
const request = require('supertest');
const { createAuthService } = require('../src/backend/services/auth.service');
const { createResponseService } = require('../src/backend/services/response.service');
const { hashPassword } = require('../src/backend/services/password');
const { createApp } = require('../src/backend/app');

const users = [
  { user_id: 1, username: 'nv.q10', password_hash: hashPassword('Matkhau@123'), full_name: 'Nguyễn Thị Lan',
    role: 'NHAN_VIEN', center_id: 1, center_name: 'Trung tâm bảo hành Quận 10', is_active: true },
  { user_id: 2, username: 'nghi.viec', password_hash: hashPassword('Matkhau@123'), full_name: 'X',
    role: 'NHAN_VIEN', center_id: 1, center_name: 'Q10', is_active: false },
];
const authService = createAuthService({
  userRepository: { findByUsername: async (u) => users.find((x) => x.username === u) || null },
  secret: 'test-secret-key-0123456789',
});

describe('AuthService', () => {
  test('[Luồng đúng] đúng mật khẩu -> token giải mã ra đúng vai trò và trung tâm', async () => {
    const { token, user } = await authService.login('nv.q10', 'Matkhau@123');
    expect(user).toMatchObject({ role: 'NHAN_VIEN', center_id: 1 });
    expect(user.password_hash).toBeUndefined();
    expect(authService.verify(token)).toMatchObject({ username: 'nv.q10', role: 'NHAN_VIEN', center_id: 1 });
  });

  test.each([['nv.q10', 'sai-mat-khau'], ['khong.ton.tai', 'Matkhau@123'], ['nghi.viec', 'Matkhau@123']])(
    '[Dữ liệu sai] %s / %s -> cùng một lỗi INVALID_CREDENTIALS', async (u, p) => {
      await expect(authService.login(u, p))
        .rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', message: 'Sai tên đăng nhập hoặc mật khẩu' });
    },
  );
});

describe('API4 qua HTTP – cổng đăng nhập', () => {
  const app = createApp({
    db: {},
    services: {
      authService,
      responseService: createResponseService({ reportRepository: { listResponses: async () => ({ total: 0, rows: [] }) } }),
      reportService: {},
      surveyService: {},
    },
  });

  test('[Dữ liệu sai] không gửi token -> 401 UNAUTHORIZED', async () => {
    const res = await request(app).get('/api/survey-responses');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  test('[Dữ liệu sai] token giả mạo -> 401', async () => {
    const res = await request(app).get('/api/survey-responses').set('Authorization', 'Bearer abc.def.ghi');
    expect(res.status).toBe(401);
  });

  test('[Luồng đúng] đăng nhập qua API rồi gọi API4 -> 200, total = 0 khi chưa có dữ liệu', async () => {
    const login = await request(app).post('/api/auth/login').send({ username: 'nv.q10', password: 'Matkhau@123' });
    expect(login.status).toBe(200);
    const res = await request(app).get('/api/survey-responses').set('Authorization', `Bearer ${login.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ total: 0, page: 1, page_size: 20, items: [] });
  });

  test('[Dữ liệu sai] ngày sai định dạng -> 400 kèm field', async () => {
    const { token } = await authService.login('nv.q10', 'Matkhau@123');
    const res = await request(app).get('/api/survey-responses?from=2026-02-30').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.error.field).toBe('from');
  });
});
