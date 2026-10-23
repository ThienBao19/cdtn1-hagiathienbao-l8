// Kiểm thử ResponseService + hợp đồng toResponseView – US5, AC5.1–AC5.3, QT-14, QT-15, BR-L8-04
const { createResponseService } = require('../src/backend/services/response.service');
const { toResponseView } = require('../src/backend/services/response.contract');

const ROW = {
  response_id: 2588, ticket_code: 'BH-000098/2026', center_name: 'Trung tâm bảo hành Quận 10',
  customer_name: 'Nguyễn Văn Hùng', phone: '0901234567', technician_name: null,
  csat_score: 2, nps_score: null, comment: null, responded_at: new Date('2026-09-28T03:12:00Z'),
};

function setup(rows = [ROW]) {
  const calls = [];
  const reportRepository = { listResponses: async (args) => { calls.push(args); return { total: rows.length, rows }; } };
  return { calls, service: createResponseService({ reportRepository }) };
}
const NV = { role: 'NHAN_VIEN', center_id: 1 };
const base = { page: 1, pageSize: 20 };

describe('toResponseView – hợp đồng dữ liệu một phản hồi', () => {
  test('[Luồng đúng] đủ đúng 11 trường; ngày ISO 8601; CSAT 2 -> is_flagged', () => {
    const v = toResponseView(ROW, 'NHAN_VIEN');
    expect(Object.keys(v).sort()).toEqual(['center_name', 'comment', 'csat_score', 'customer_name', 'is_flagged', 'nps_score',
      'phone', 'responded_at', 'response_id', 'technician_name', 'ticket_code']);
    expect(v.responded_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(v.is_flagged).toBe(true);
    expect(v.technician_name).toBeNull();
  });

  test('[Luồng đúng] QT-15: Nhân viên thấy số che, Quản lý trung tâm thấy số đầy đủ', () => {
    expect(toResponseView(ROW, 'NHAN_VIEN').phone).toBe('090****567');
    expect(toResponseView(ROW, 'QUAN_LY').phone).toBe('0901234567');
  });
});

describe('ResponseService.list', () => {
  test('[Luồng đúng] AC5.1: lọc theo trung tâm của người dùng; "đến ngày" tính trọn ngày 30/09', async () => {
    const { service, calls } = setup();
    const r = await service.list(NV, { ...base, from: '2026-09-01', to: '2026-09-30', csatMax: 2 });
    expect(r).toMatchObject({ total: 1, page: 1, page_size: 20 });
    expect(calls[0]).toMatchObject({ centerId: 1, csatMax: 2, limit: 20, offset: 0 });
    expect(calls[0].from.toISOString()).toBe('2026-08-31T17:00:00.000Z'); // 00:00 01/09 giờ VN
    expect(calls[0].to.toISOString()).toBe('2026-09-30T17:00:00.000Z');   // 00:00 01/10 giờ VN
  });

  test('[Dữ liệu sai] QT-14: Nhân viên trung tâm 1 xin center_id = 2 -> FORBIDDEN, không truy vấn', async () => {
    const { service, calls } = setup();
    await expect(service.list(NV, { ...base, centerId: 2 })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(calls).toHaveLength(0);
  });

  test('[Dữ liệu sai] AC5.3: từ 30/09 đến 01/09 -> báo "Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc"', async () => {
    const { service } = setup();
    await expect(service.list(NV, { ...base, from: '2026-09-30', to: '2026-09-01' }))
      .rejects.toMatchObject({ code: 'VALIDATION_ERROR', message: 'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc' });
  });

  test('[Giá trị biên] from = to hợp lệ; khoảng 366 ngày hợp lệ, 367 ngày bị từ chối; page_size 100 hợp lệ, 101 bị từ chối', async () => {
    const { service } = setup();
    await expect(service.list(NV, { ...base, from: '2026-09-15', to: '2026-09-15' })).resolves.toBeDefined();
    await expect(service.list(NV, { ...base, from: '2025-01-01', to: '2026-01-02' })).resolves.toBeDefined();
    await expect(service.list(NV, { ...base, from: '2025-01-01', to: '2026-01-03' })).rejects.toMatchObject({ field: 'to' });
    await expect(service.list(NV, { page: 1, pageSize: 100 })).resolves.toBeDefined();
    await expect(service.list(NV, { page: 1, pageSize: 101 })).rejects.toMatchObject({ field: 'page_size' });
  });

  test('[Luồng đúng] AC5.2: không có phản hồi phù hợp -> total = 0, items rỗng (không lỗi)', async () => {
    const { service } = setup([]);
    await expect(service.list(NV, base)).resolves.toMatchObject({ total: 0, items: [] });
  });
});
