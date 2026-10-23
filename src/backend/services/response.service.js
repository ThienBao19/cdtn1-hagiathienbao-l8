// ResponseService – Nhân viên / Quản lý tra cứu danh sách phản hồi (US5, FR5, UC3, API4).
//  • QT-14: chỉ xem trung tâm mình; xin center_id khác -> FORBIDDEN.
//  • AC5.3: ngày bắt đầu phải ≤ ngày kết thúc; khoảng lọc tối đa 366 ngày (api-contract mục 3).
//  • QT-15 + BR-L8-04: áp dụng trong toResponseView (response.contract.js).
const { AppError, ValidationError } = require('../errors/app-error');
const { toResponseView } = require('./response.contract');

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 366;

// Ngày YYYY-MM-DD hiểu theo giờ Việt Nam (+07:00)
const startOfDayVN = (d) => new Date(`${d}T00:00:00+07:00`);

function createResponseService({ reportRepository }) {
  return {
    /**
     * @param {{role: string, center_id: number}} user Người gọi (từ JWT).
     * @param {{centerId?: number, from?: string, to?: string, csatMax?: number, page: number, pageSize: number}} f
     *   Bộ lọc đã qua validator (đúng kiểu, đúng định dạng).
     * @returns {Promise<{total: number, page: number, page_size: number, items: object[]}>} total = 0 khi không có kết quả.
     */
    async list(user, f) {
      if (f.centerId !== undefined && f.centerId !== user.center_id) {
        throw new AppError('FORBIDDEN', 'Bạn chỉ được xem phản hồi của trung tâm mình phụ trách');
      }
      if (f.from && f.to && f.from > f.to) {
        throw new ValidationError('from', 'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc');
      }
      if (f.from && f.to && (startOfDayVN(f.to) - startOfDayVN(f.from)) / DAY_MS > MAX_RANGE_DAYS) {
        throw new ValidationError('to', `Khoảng thời gian tối đa ${MAX_RANGE_DAYS} ngày`);
      }
      if (f.csatMax !== undefined && (f.csatMax < 1 || f.csatMax > 5)) {
        throw new ValidationError('csat_max', 'CSAT tối đa phải từ 1 đến 5');
      }
      if (f.pageSize < 1 || f.pageSize > 100) throw new ValidationError('page_size', 'page_size phải từ 1 đến 100');

      const { total, rows } = await reportRepository.listResponses({
        centerId: user.center_id,
        from: f.from ? startOfDayVN(f.from) : null,
        to: f.to ? new Date(startOfDayVN(f.to).getTime() + DAY_MS) : null, // "đến ngày" tính trọn ngày đó
        csatMax: f.csatMax ?? null,
        limit: f.pageSize,
        offset: (f.page - 1) * f.pageSize,
      });
      return { total, page: f.page, page_size: f.pageSize, items: rows.map((r) => toResponseView(r, user.role)) };
    },
  };
}

module.exports = { createResponseService };
