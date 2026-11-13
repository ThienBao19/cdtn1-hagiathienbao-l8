// TechnicianService – quản lý kỹ thuật viên (CRUD, thực thể 2; là chiều tổng hợp CSAT/NPS của FR6).
//  • Kỹ thuật viên phải thuộc một trung tâm bảo hành có thật.
//  • QT-13: "xoá" = đánh dấu ngừng làm việc (is_active = false), giữ lại để báo cáo các phiếu cũ.
//  • QT-14 + OWASP A01 (BUG-009): kỹ thuật viên thuộc về MỘT trung tâm – chỉ Quản lý của chính trung tâm đó
//    được tạo, sửa, ngừng; không được chuyển kỹ thuật viên sang trung tâm khác. Ai đã đăng nhập cũng xem được.
const { AppError } = require('../errors/app-error');
const { ROLES } = require('./auth.service');

/** Người gọi phải là Quản lý của trung tâm centerId, nếu không -> FORBIDDEN. */
function requireManagerOf(user, centerId) {
  if (!user || user.role !== ROLES.QUAN_LY || user.center_id !== centerId) {
    throw new AppError('FORBIDDEN', 'Chỉ Quản lý của trung tâm này được thay đổi kỹ thuật viên của trung tâm');
  }
}

function createTechnicianService({ technicianRepository }) {
  async function getOrThrow(id) {
    const tech = await technicianRepository.findById(id);
    if (!tech) throw new AppError('TECHNICIAN_NOT_FOUND', `Không tìm thấy kỹ thuật viên #${id}`);
    return tech;
  }
  async function ensureCenter(centerId) {
    if (!(await technicianRepository.centerExists(centerId))) {
      throw new AppError('CENTER_NOT_FOUND', `Không có trung tâm bảo hành #${centerId}`);
    }
  }

  return {
    list({ centerId, includeInactive = false } = {}) {
      return technicianRepository.findAll({ centerId, includeInactive });
    },
    get: getOrThrow,
    async create(user, data) {
      requireManagerOf(user, data.center_id);
      await ensureCenter(data.center_id);
      return technicianRepository.insert(data);
    },
    async update(user, id, data) {
      const current = await getOrThrow(id);
      requireManagerOf(user, current.center_id);   // phải quản lý trung tâm HIỆN TẠI của kỹ thuật viên
      requireManagerOf(user, data.center_id);      // và không chuyển sang trung tâm khác
      if (!current.is_active) throw new AppError('TECHNICIAN_INACTIVE', 'Kỹ thuật viên đã ngừng làm việc, không sửa được');
      await ensureCenter(data.center_id);
      return technicianRepository.update(id, data);
    },
    async deactivate(user, id) {
      const current = await getOrThrow(id);
      requireManagerOf(user, current.center_id);
      if (!current.is_active) return current;
      return technicianRepository.setActive(id, false);
    },
  };
}

module.exports = { createTechnicianService };
