// Kiểm thử CustomerService – phone duy nhất, QT-13 (không xoá vật lý), QT-15 (che số điện thoại)
const { createCustomerService, maskPhone } = require('../src/backend/services/customer.service');
const { createFakeDb } = require('./fakes/in-memory-repositories');

function setup() {
  const fake = createFakeDb();
  return { fake, service: createCustomerService(fake) };
}

test('[Luồng đúng] tạo khách hàng -> trả số điện thoại dạng che 090****567 (QT-15)', async () => {
  const { service } = setup();
  const c = await service.create({ full_name: 'Nguyễn Văn Hùng', phone: '0901234567' });
  expect(c).toMatchObject({ full_name: 'Nguyễn Văn Hùng', phone: '090****567', is_active: true });
});

test('[Dữ liệu sai] trùng số điện thoại -> PHONE_EXISTS', async () => {
  const { service } = setup();
  await service.create({ full_name: 'A', phone: '0901234567' });
  await expect(service.create({ full_name: 'B', phone: '0901234567' })).rejects.toMatchObject({ code: 'PHONE_EXISTS' });
});

test('[Luồng đúng] QT-13: xoá = ngừng sử dụng, bản ghi vẫn còn; gọi xoá lần 2 không lỗi', async () => {
  const { fake, service } = setup();
  const c = await service.create({ full_name: 'A', phone: '0901234567' });
  await service.deactivate(c.customer_id);
  await expect(service.deactivate(c.customer_id)).resolves.toMatchObject({ is_active: false });
  expect(fake.db.customers).toHaveLength(1);
  expect(await service.list()).toHaveLength(0);
  expect(await service.list({ includeInactive: true })).toHaveLength(1);
  await expect(service.update(c.customer_id, { full_name: 'A2', phone: '0901234567' }))
    .rejects.toMatchObject({ code: 'CUSTOMER_INACTIVE' });
});

test('[Giá trị biên] maskPhone giữ 3 số đầu, 3 số cuối của số 10 chữ số', () => {
  expect(maskPhone('0901234567')).toBe('090****567');
});
