// Test hồi quy BUG-001 (docs/bug-log.md): BIGINT từ PostgreSQL phải là số, không phải chuỗi.
// Trước khi sửa: customer_id = "6" (chuỗi) nên so với 6 (số) luôn khác -> sửa khách giữ nguyên số điện thoại bị báo trùng.
const { types } = require('pg');
require('../src/backend/db/pool'); // nạp module để đăng ký bộ chuyển kiểu
const { createCustomerService } = require('../src/backend/services/customer.service');

test('[Dữ liệu sai] BUG-001: BIGINT (OID 20) đọc từ CSDL được đổi về number', () => {
  expect(types.getTypeParser(20)('6')).toBe(6);
});

test('[Luồng đúng] BUG-001: sửa tên khách, giữ nguyên số điện thoại của chính mình -> không báo PHONE_EXISTS', async () => {
  const row = { customer_id: types.getTypeParser(20)('6'), full_name: 'Đặng Minh Thư', phone: '0977888999', is_active: true };
  const customerRepository = {
    findById: async () => row,
    findByPhone: async () => row,
    update: async (id, data) => ({ ...row, ...data }),
  };
  const service = createCustomerService({ customerRepository });
  await expect(service.update(6, { full_name: 'Đặng Minh Thư (đã sửa)', phone: '0977888999' }))
    .resolves.toMatchObject({ full_name: 'Đặng Minh Thư (đã sửa)', phone: '097****999' });
});
