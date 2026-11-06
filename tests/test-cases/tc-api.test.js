// Test Report BT3 – tầng API / hệ thống (TC-08, TC-10, TC-11): gọi HTTP thật vào app Express qua Supertest,
// đủ routes → controllers → services; repository giả để mỗi test tự dựng dữ liệu, không phụ thuộc máy chạy.
const request = require('supertest');
const { createApp } = require('../../src/backend/app');
const { createFakeDb } = require('../fakes/in-memory-repositories');
const { createSurveyService } = require('../../src/backend/services/survey.service');
const { createInvitationService } = require('../../src/backend/services/invitation.service');
const { createCustomerService } = require('../../src/backend/services/customer.service');
const { createTechnicianService } = require('../../src/backend/services/technician.service');
const { createAuthService } = require('../../src/backend/services/auth.service');
const { createResponseService } = require('../../src/backend/services/response.service');
const { createReportService } = require('../../src/backend/services/report.service');
const { hashPassword } = require('../../src/backend/services/password');

const SECRET = 'khoa-ky-jwt-chi-dung-cho-test-123';
const TOKEN = 'a'.repeat(64);
const silent = { info() {}, warn() {}, error() {}, debug() {} };

/** Hai tài khoản mẫu như seeds/003: nv.q10 (Nhân viên, trung tâm 1) và ql.tb (Quản lý, trung tâm 2). */
const USERS = [
  { user_id: 1, username: 'nv.q10', full_name: 'Nguyễn Thị Lan', role: 'NHAN_VIEN', center_id: 1, center_name: 'Trung tâm bảo hành Quận 10' },
  { user_id: 4, username: 'ql.tb', full_name: 'Võ Thị Trâm', role: 'QUAN_LY', center_id: 2, center_name: 'Trung tâm bảo hành Quận Tân Bình' },
].map((u) => ({ ...u, is_active: true, password_hash: hashPassword('Matkhau@123', '00112233445566778899aabbccddeeff') }));

/** Phản hồi mẫu của hai trung tâm – repository giả chỉ trả dòng đúng center_id được hỏi (như SQL thật). */
const RESPONSES = [
  { center_id: 1, response_id: 2588, ticket_code: 'BH-000098/2026', center_name: 'Trung tâm bảo hành Quận 10', customer_name: 'Nguyễn Văn Hùng',
    phone: '0901234567', technician_name: 'Lê Minh Dũng', csat_score: 2, nps_score: 3, comment: 'Sửa lâu', responded_at: new Date('2026-09-28T03:12:00Z') },
  { center_id: 2, response_id: 2601, ticket_code: 'BH-000201/2026', center_name: 'Trung tâm bảo hành Quận Tân Bình', customer_name: 'Trần Thị Lan',
    phone: '0912345678', technician_name: 'Trần Thị Mai', csat_score: 5, nps_score: 10, comment: null, responded_at: new Date('2026-09-29T08:00:00Z') },
];

function buildApp() {
  const fake = createFakeDb();
  const ticket = fake.addTicket({ ticket_code: 'BH-000123/2026', status: 'DA_DONG' });
  fake.addInvitation(ticket, { token: TOKEN, created_at: new Date() });
  fake.addTicket({ ticket_code: 'BH-000106/2026', status: 'DA_DONG' }); // phiếu Đã đóng, CHƯA có lời mời
  fake.db.customers.push({ customer_id: 6, full_name: 'Đặng Minh Thư', phone: '0977888999', is_active: true, created_at: new Date() });

  const reportRepository = {
    async listResponses({ centerId }) {
      const rows = RESPONSES.filter((r) => r.center_id === centerId);
      return { total: rows.length, rows };
    },
  };
  const technicianRepository = { async findAll() { return []; } };
  const services = {
    surveyService: createSurveyService(fake),
    invitationService: createInvitationService(fake),
    customerService: createCustomerService(fake),
    technicianService: createTechnicianService({ technicianRepository }),
    authService: createAuthService({ userRepository: { findByUsername: async (n) => USERS.find((u) => u.username === n) || null }, secret: SECRET }),
    responseService: createResponseService({ reportRepository }),
    reportService: createReportService({ reportRepository }),
  };
  return { app: createApp({ services, db: {}, logger: silent }), fake };
}

async function login(app, username) {
  const res = await request(app).post('/api/auth/login').send({ username, password: 'Matkhau@123' });
  expect(res.status).toBe(200);
  return res.body.token;
}

describe('API – Supertest qua app Express', () => {
  test('TC-08 [Dữ liệu sai] BR-L8-02: CSAT = 6 -> 400 VALIDATION_ERROR nêu field csat_score, không lưu phản hồi', async () => {
    const { app, fake } = buildApp();
    const before = fake.db.responses.length;
    const res = await request(app).post(`/api/surveys/${TOKEN}/responses`).send({ csat_score: 6, nps_score: 9 });
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual({ code: 'VALIDATION_ERROR', message: 'Điểm CSAT phải là số nguyên từ 1 đến 5', field: 'csat_score' });
    expect([before, fake.db.responses.length]).toEqual([0, 0]);
  });

  test('TC-10 [Bảo mật] QT-14, QT-15: Nhân viên Q10 xin trung tâm 2 -> 403; danh sách của mình chỉ trung tâm 1, SĐT bị che', async () => {
    const { app } = buildApp();
    const token = await login(app, 'nv.q10');

    const other = await request(app).get('/api/survey-responses?center_id=2').set('Authorization', `Bearer ${token}`);
    expect(other.status).toBe(403);
    expect(other.body.error.code).toBe('FORBIDDEN');

    const own = await request(app).get('/api/survey-responses').set('Authorization', `Bearer ${token}`);
    expect(own.status).toBe(200);
    expect(own.body.items.map((i) => [i.ticket_code, i.phone, i.is_flagged])).toEqual([['BH-000098/2026', '090****567', true]]);
    expect(JSON.stringify(own.body)).not.toContain('0901234567');
  });

  test('TC-11 [Bảo mật] OWASP A01: KHÔNG đăng nhập thì không đọc/sửa khách hàng, không tạo lời mời -> 401', async () => {
    const { app, fake } = buildApp();
    const list = await request(app).get('/api/customers');
    const del = await request(app).delete('/api/customers/6');
    const inv = await request(app).post('/api/survey-invitations').send({ ticket_code: 'BH-000106/2026' });

    expect([list.status, del.status, inv.status]).toEqual([401, 401, 401]);
    expect(del.body.error.code).toBe('UNAUTHORIZED');
    // Tác dụng phụ: khách 6 vẫn đang hoạt động, phiếu BH-000106/2026 chưa có lời mời
    expect(fake.db.customers.find((c) => c.customer_id === 6).is_active).toBe(true);
    expect(fake.db.invitations).toHaveLength(1);

    // Đã đăng nhập thì vẫn dùng bình thường
    const token = await login(app, 'ql.tb');
    const ok = await request(app).get('/api/customers').set('Authorization', `Bearer ${token}`);
    expect(ok.status).toBe(200);
  });
});
