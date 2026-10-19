// CustomerService – quản lý hồ sơ khách hàng (CRUD, thực thể 1).
//  • Số điện thoại là duy nhất (UNIQUE phone – ERD BT1).
//  • QT-13: không xoá vật lý – "xoá" = đánh dấu ngừng sử dụng (is_active = false).
//  • QT-15: số điện thoại trả ra dạng che 090****567 (Sprint 1 chưa có đăng nhập nên che với mọi người gọi).
const { AppError, DuplicateKeyError } = require('../errors/app-error');

function maskPhone(phone) {
  if (typeof phone !== 'string' || phone.length < 7) return phone;
  return `${phone.slice(0, 3)}****${phone.slice(-3)}`;
}

const toDto = (c) => ({ ...c, phone: maskPhone(c.phone) });

function createCustomerService({ customerRepository }) {
  async function getOrThrow(id) {
    const customer = await customerRepository.findById(id);
    if (!customer) throw new AppError('CUSTOMER_NOT_FOUND', `Không tìm thấy khách hàng #${id}`);
    return customer;
  }

  async function ensurePhoneFree(phone, exceptId) {
    const owner = await customerRepository.findByPhone(phone);
    if (owner && owner.customer_id !== exceptId) {
      throw new AppError('PHONE_EXISTS', 'Số điện thoại đã thuộc về một khách hàng khác');
    }
  }

  async function save(fn) {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof DuplicateKeyError) throw new AppError('PHONE_EXISTS', 'Số điện thoại đã thuộc về một khách hàng khác');
      throw err;
    }
  }

  return {
    async list({ includeInactive = false } = {}) {
      const rows = await customerRepository.findAll({ includeInactive });
      return rows.map(toDto);
    },
    async get(id) {
      return toDto(await getOrThrow(id));
    },
    async create({ full_name, phone }) {
      await ensurePhoneFree(phone);
      return toDto(await save(() => customerRepository.insert({ full_name, phone })));
    },
    async update(id, { full_name, phone }) {
      const current = await getOrThrow(id);
      if (!current.is_active) throw new AppError('CUSTOMER_INACTIVE', 'Khách hàng đã ngừng sử dụng, không sửa được');
      await ensurePhoneFree(phone, current.customer_id);
      return toDto(await save(() => customerRepository.update(id, { full_name, phone })));
    },
    async deactivate(id) {
      const current = await getOrThrow(id);
      if (!current.is_active) return toDto(current); // gọi lại lần 2 không lỗi, kết quả như nhau
      return toDto(await customerRepository.setActive(id, false));
    },
  };
}

module.exports = { createCustomerService, maskPhone };
