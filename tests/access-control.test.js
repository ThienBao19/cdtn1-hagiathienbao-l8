// Kiểm soát truy cập theo trung tâm sở hữu (OWASP A01, QT-14) cho kỹ thuật viên – hồi quy BUG-009.
// Kỹ thuật viên thuộc về MỘT trung tâm: chỉ Quản lý của chính trung tâm đó được tạo, sửa, ngừng; Nhân viên chỉ xem.
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createApp } = require('../src/backend/app');
const { createTechnicianService } = require('../src/backend/services/technician.service');
const { createAuthService } = require('../src/backend/services/auth.service');

const SECRET = 'khoa-ky-jwt-chi-dung-cho-test-123';
const as = (role, center_id) => `Bearer ${jwt.sign({ sub: 1, username: 'u', role, center_id }, SECRET)}`;
const NV_Q10 = as('NHAN_VIEN', 1);
const QL_Q10 = as('QUAN_LY', 1);
const QL_TB = as('QUAN_LY', 2);
const silent = { info() {}, warn() {}, error() {}, debug() {} };

function buildApp() {
  const techs = [
    { technician_id: 1, center_id: 1, center_name: 'Trung tâm bảo hành Quận 10', full_name: 'Lê Minh Dũng', level: 'CAO_CAP', is_active: true },
    { technician_id: 3, center_id: 2, center_name: 'Trung tâm bảo hành Quận Tân Bình', full_name: 'Trần Thị Mai', level: 'TRUNG_CAP', is_active: true },
  ];
  const technicianRepository = {
    async findAll() { return techs; },
    async findById(id) { return techs.find((t) => t.technician_id === id) || null; },
    async centerExists(id) { return [1, 2].includes(id); },
    async insert(d) { const t = { technician_id: 100 + techs.length, ...d, is_active: true }; techs.push(t); return t; },
    async update(id, d) { const t = techs.find((x) => x.technician_id === id); Object.assign(t, d); return t; },
    async setActive(id, v) { const t = techs.find((x) => x.technician_id === id); t.is_active = v; return t; },
  };
  const services = {
    surveyService: {},
    technicianService: createTechnicianService({ technicianRepository }),
    authService: createAuthService({ userRepository: {}, secret: SECRET }),
  };
  return { app: createApp({ services, db: {}, logger: silent }), techs };
}

describe('Kỹ thuật viên – kiểm soát truy cập theo trung tâm (BUG-009)', () => {
  test('[Bảo mật] Nhân viên Q10 ngừng kỹ thuật viên của trung tâm Tân Bình -> 403, kỹ thuật viên vẫn hoạt động', async () => {
    const { app, techs } = buildApp();
    const res = await request(app).delete('/api/technicians/3').set('Authorization', NV_Q10);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(techs.find((t) => t.technician_id === 3).is_active).toBe(true);
  });

  test('[Bảo mật] Quản lý Q10 sửa hoặc ngừng kỹ thuật viên của trung tâm khác -> 403; tạo vào trung tâm khác -> 403', async () => {
    const { app, techs } = buildApp();
    const put = await request(app).put('/api/technicians/3').set('Authorization', QL_Q10)
      .send({ center_id: 2, full_name: 'Đổi tên', level: 'SO_CAP' });
    const del = await request(app).delete('/api/technicians/3').set('Authorization', QL_Q10);
    const post = await request(app).post('/api/technicians').set('Authorization', QL_Q10)
      .send({ center_id: 2, full_name: 'Người mới', level: 'SO_CAP' });
    expect([put.status, del.status, post.status]).toEqual([403, 403, 403]);
    expect(techs).toHaveLength(2);
    expect(techs.find((t) => t.technician_id === 3)).toMatchObject({ full_name: 'Trần Thị Mai', is_active: true });
  });

  test('[Bảo mật] Quản lý KHÔNG được chuyển kỹ thuật viên của mình sang trung tâm khác -> 403', async () => {
    const { app } = buildApp();
    const res = await request(app).put('/api/technicians/1').set('Authorization', QL_Q10)
      .send({ center_id: 2, full_name: 'Lê Minh Dũng', level: 'CAO_CAP' });
    expect(res.status).toBe(403);
  });

  test('[Luồng đúng] Quản lý của chính trung tâm được tạo, sửa, ngừng; Nhân viên vẫn xem được danh sách', async () => {
    const { app } = buildApp();
    expect((await request(app).post('/api/technicians').set('Authorization', QL_TB).send({ center_id: 2, full_name: 'Bùi Văn Tài', level: 'SO_CAP' })).status).toBe(201);
    expect((await request(app).put('/api/technicians/3').set('Authorization', QL_TB).send({ center_id: 2, full_name: 'Trần Thị Mai', level: 'CAO_CAP' })).status).toBe(200);
    expect((await request(app).delete('/api/technicians/3').set('Authorization', QL_TB)).body.is_active).toBe(false);
    expect((await request(app).get('/api/technicians').set('Authorization', NV_Q10)).status).toBe(200);
  });
});
