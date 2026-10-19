// TechnicianService – quản lý kỹ thuật viên (CRUD, thực thể 2; là chiều tổng hợp CSAT/NPS của FR6).
//  • Kỹ thuật viên phải thuộc một trung tâm bảo hành có thật.
//  • QT-13: "xoá" = đánh dấu ngừng làm việc (is_active = false), giữ lại để báo cáo các phiếu cũ.
const { AppError } = require('../errors/app-error');

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
    async create(data) {
      await ensureCenter(data.center_id);
      return technicianRepository.insert(data);
    },
    async update(id, data) {
      const current = await getOrThrow(id);
      if (!current.is_active) throw new AppError('TECHNICIAN_INACTIVE', 'Kỹ thuật viên đã ngừng làm việc, không sửa được');
      await ensureCenter(data.center_id);
      return technicianRepository.update(id, data);
    },
    async deactivate(id) {
      const current = await getOrThrow(id);
      if (!current.is_active) return current;
      return technicianRepository.setActive(id, false);
    },
  };
}

module.exports = { createTechnicianService };
