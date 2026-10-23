// ReportService – chỉ số CSAT/NPS cho Quản lý trung tâm (US6 FR6 UC4, US7 FR7 UC5).
//  • BR-L8-03: NPS = %(NPS 9–10) − %(NPS 0–6), chỉ tính phản hồi CÓ điểm NPS; tỉ lệ CSAT = %(CSAT 4–5).
//  • QT-14: chỉ trung tâm mình. US6, US7 thuộc vai trò Quản lý trung tâm.
//  • Mỗi con số trả kèm mốc so sánh (tháng trước, toàn hệ thống) – nguyên tắc trình bày Buổi 9.
const { AppError, ValidationError } = require('../errors/app-error');
const { ROLES } = require('./auth.service');

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const MAX_TREND_MONTHS = 24;

/** Tháng YYYY-MM -> mốc bắt đầu tháng theo giờ Việt Nam. */
const monthStart = (m) => new Date(`${m}-01T00:00:00+07:00`);
/** Cộng n tháng vào chuỗi YYYY-MM. */
function addMonths(m, n) {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(Date.UTC(y, mo - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
/** Tháng hiện tại theo giờ Việt Nam. */
const currentMonthVN = (now) => new Date(now.getTime() + 7 * 3600e3).toISOString().slice(0, 7);

/**
 * Tính chỉ số từ số đếm (BR-L8-03). Không có phản hồi thì các chỉ số là null – KHÔNG phải 0.
 * @param {{n, csat_sum, csat_good, nps_n, promoters, detractors}} c
 * @returns {{responses: number, csat_avg: number|null, csat_rate: number|null, nps: number|null, nps_responses: number}}
 *   csat_avg làm tròn 2 chữ số; csat_rate là % (1 chữ số thập phân); nps là số nguyên −100..100.
 */
function computeMetrics(c = {}) {
  const n = c.n || 0;
  const npsN = c.nps_n || 0;
  return {
    responses: n,
    csat_avg: n ? Math.round((c.csat_sum / n) * 100) / 100 : null,
    csat_rate: n ? Math.round((c.csat_good * 1000) / n) / 10 : null,
    nps: npsN ? Math.round(((c.promoters - c.detractors) * 100) / npsN) : null,
    nps_responses: npsN,
  };
}

function requireManager(user) {
  if (user.role !== ROLES.QUAN_LY) throw new AppError('FORBIDDEN', 'Chỉ Quản lý trung tâm được xem báo cáo này');
}
function parseMonth(value, field, fallback) {
  if (value === undefined) return fallback;
  if (!MONTH_RE.test(value)) throw new ValidationError(field, `${field} phải có dạng YYYY-MM, ví dụ 2026-09`);
  return value;
}

function createReportService({ reportRepository, now = () => new Date() }) {
  return {
    /** US6 – chỉ số theo kỹ thuật viên của tháng được chọn, kèm tháng trước để so sánh. */
    async byTechnician(user, { month } = {}) {
      requireManager(user);
      const m = parseMonth(month, 'month', currentMonthVN(now()));
      const prev = addMonths(m, -1);
      const centerId = user.center_id;
      const [cur, old] = await Promise.all([
        reportRepository.countsByTechnician({ centerId, from: monthStart(m), to: monthStart(addMonths(m, 1)) }),
        reportRepository.countsByTechnician({ centerId, from: monthStart(prev), to: monthStart(m) }),
      ]);
      const oldById = new Map(old.map((r) => [r.technician_id, r]));
      const sum = (rows) => rows.reduce((a, r) => {
        ['n', 'csat_sum', 'csat_good', 'nps_n', 'promoters', 'detractors'].forEach((k) => { a[k] = (a[k] || 0) + r[k]; });
        return a;
      }, {});
      const technicians = cur
        .map((r) => ({
          technician_id: r.technician_id,
          technician_name: r.technician_name,
          level: r.level,
          current: computeMetrics(r),
          previous: computeMetrics(oldById.get(r.technician_id)),
        }))
        .filter((t) => t.current.responses > 0 || t.previous.responses > 0)
        // KTV có CSAT thấp nhất lên đầu để quản lý xử lý trước; chưa có phản hồi xếp cuối
        .sort((a, b) => (a.current.csat_avg ?? 99) - (b.current.csat_avg ?? 99));
      return {
        center_id: centerId,
        month: m,
        previous_month: prev,
        center: { current: computeMetrics(sum(cur)), previous: computeMetrics(sum(old)) },
        technicians,
      };
    },

    /** US7 – tỉ lệ CSAT và NPS theo tháng của trung tâm, kèm toàn hệ thống làm mốc tham chiếu. */
    async monthlyTrend(user, { from, to } = {}) {
      requireManager(user);
      const end = parseMonth(to, 'to', currentMonthVN(now()));
      const start = parseMonth(from, 'from', `${end.slice(0, 4)}-01`);
      if (start > end) throw new ValidationError('from', 'Tháng bắt đầu phải nhỏ hơn hoặc bằng tháng kết thúc');
      const months = [];
      for (let m = start; m <= end; m = addMonths(m, 1)) months.push(m);
      if (months.length > MAX_TREND_MONTHS) throw new ValidationError('from', `Tối đa ${MAX_TREND_MONTHS} tháng`);

      const range = { from: monthStart(start), to: monthStart(addMonths(end, 1)) };
      const [centerRows, systemRows] = await Promise.all([
        reportRepository.countsByMonth({ centerId: user.center_id, ...range }),
        reportRepository.countsByMonth({ centerId: null, ...range }),
      ]);
      const byMonth = (rows) => new Map(rows.map((r) => [r.month, r]));
      const c = byMonth(centerRows); const s = byMonth(systemRows);
      return {
        center_id: user.center_id,
        from: start,
        to: end,
        months: months.map((m) => ({ month: m, center: computeMetrics(c.get(m)), system: computeMetrics(s.get(m)) })),
      };
    },
  };
}

module.exports = { createReportService, computeMetrics, addMonths };
