// Báo cáo cho dashboard M3 (US6, US7). Chỉ số null = không có phản hồi (không phải 0).
import { apiRequest } from './client';

const toMetrics = (m) => ({
  responses: m.responses, csatAvg: m.csat_avg, csatRate: m.csat_rate, nps: m.nps, npsResponses: m.nps_responses,
});

export async function getTechnicianReport(month) {
  const d = await apiRequest('/reports/technicians', { auth: true, query: { month } });
  return {
    month: d.month,
    previousMonth: d.previous_month,
    center: { current: toMetrics(d.center.current), previous: toMetrics(d.center.previous) },
    technicians: d.technicians.map((t) => ({
      id: t.technician_id, name: t.technician_name, level: t.level,
      current: toMetrics(t.current), previous: toMetrics(t.previous),
    })),
  };
}

export async function getMonthlyTrend(from, to) {
  const d = await apiRequest('/reports/monthly-trend', { auth: true, query: { from, to } });
  return d.months.map((m) => ({ month: m.month, center: toMetrics(m.center), system: toMetrics(m.system) }));
}
