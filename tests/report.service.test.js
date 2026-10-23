// Kiểm thử ReportService – BR-L8-03 (công thức NPS, tỉ lệ CSAT), quyền Quản lý trung tâm (US6, US7)
const { computeMetrics, createReportService, addMonths } = require('../src/backend/services/report.service');

describe('computeMetrics – BR-L8-03', () => {
  test('[Luồng đúng] 10 phản hồi: CSAT TB, tỉ lệ CSAT 4–5, NPS = %9–10 − %0–6', () => {
    const m = computeMetrics({ n: 10, csat_sum: 38, csat_good: 7, nps_n: 8, promoters: 4, detractors: 2 });
    expect(m).toEqual({ responses: 10, csat_avg: 3.8, csat_rate: 70, nps: 25, nps_responses: 8 });
  });

  test('[Giá trị biên] NPS 9 là promoter, 6 là detractor, 7–8 trung lập: 1 promoter + 1 detractor + 2 trung lập -> NPS 0', () => {
    // promoters/detractors được đếm ở SQL theo đúng ngưỡng >= 9 và <= 6; ở đây kiểm công thức tại ranh giới
    expect(computeMetrics({ n: 4, csat_sum: 16, csat_good: 4, nps_n: 4, promoters: 1, detractors: 1 }).nps).toBe(0);
    expect(computeMetrics({ n: 1, csat_sum: 5, csat_good: 1, nps_n: 1, promoters: 1, detractors: 0 }).nps).toBe(100);
    expect(computeMetrics({ n: 1, csat_sum: 1, csat_good: 0, nps_n: 1, promoters: 0, detractors: 1 }).nps).toBe(-100);
  });

  test('[Giá trị biên] không có phản hồi -> chỉ số là null, không phải 0; có CSAT nhưng không ai chấm NPS -> nps null', () => {
    expect(computeMetrics(undefined)).toEqual({ responses: 0, csat_avg: null, csat_rate: null, nps: null, nps_responses: 0 });
    expect(computeMetrics({ n: 2, csat_sum: 9, csat_good: 2, nps_n: 0, promoters: 0, detractors: 0 }).nps).toBeNull();
  });
});

describe('ReportService – quyền và tham số', () => {
  const repo = {
    countsByTechnician: async () => [],
    countsByMonth: async ({ centerId }) => (centerId === null
      ? [{ month: '2026-09', n: 4, csat_sum: 16, csat_good: 3, nps_n: 4, promoters: 2, detractors: 1 }]
      : [{ month: '2026-09', n: 2, csat_sum: 6, csat_good: 1, nps_n: 2, promoters: 0, detractors: 1 }]),
  };
  const service = createReportService({ reportRepository: repo, now: () => new Date('2026-10-20T03:00:00Z') });

  test('[Dữ liệu sai] Nhân viên xem báo cáo theo KTV -> FORBIDDEN', async () => {
    await expect(service.byTechnician({ role: 'NHAN_VIEN', center_id: 1 }, { month: '2026-09' }))
      .rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  test('[Dữ liệu sai] tháng sai định dạng -> VALIDATION_ERROR kèm tên trường', async () => {
    await expect(service.byTechnician({ role: 'QUAN_LY', center_id: 1 }, { month: '2026-13' }))
      .rejects.toMatchObject({ code: 'VALIDATION_ERROR', field: 'month' });
  });

  test('[Luồng đúng] xu hướng: đủ mọi tháng (tháng không có dữ liệu = null), kèm mốc toàn hệ thống', async () => {
    const r = await service.monthlyTrend({ role: 'QUAN_LY', center_id: 1 }, { from: '2026-08', to: '2026-10' });
    expect(r.months.map((m) => m.month)).toEqual(['2026-08', '2026-09', '2026-10']);
    expect(r.months[0].center.csat_rate).toBeNull();
    expect(r.months[1].center).toMatchObject({ responses: 2, csat_rate: 50, nps: -50 });
    expect(r.months[1].system).toMatchObject({ responses: 4, csat_rate: 75, nps: 25 });
  });

  test('[Giá trị biên] addMonths qua năm: 2026-12 + 1 = 2027-01; 2026-01 − 1 = 2025-12', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
  });
});
