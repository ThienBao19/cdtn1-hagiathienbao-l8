const { ValidationError } = require('../errors/app-error');
const { requireBody, requireString } = require('./common');

const PHONE_RE = /^0[0-9]{9}$/; // khớp CHECK của bảng customer

function validateCustomerBody(raw) {
  const body = requireBody(raw);
  const full_name = requireString(body, 'full_name', { max: 120 });
  const phone = requireString(body, 'phone', { max: 15 });
  if (!PHONE_RE.test(phone)) {
    throw new ValidationError('phone', 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0');
  }
  return { full_name, phone };
}

module.exports = { validateCustomerBody };
