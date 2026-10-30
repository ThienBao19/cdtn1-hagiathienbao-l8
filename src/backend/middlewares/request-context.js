// Gắn mã tra cứu (requestId) cho mỗi request: trả về header X-Request-Id và dùng trong log,
// để khi người dùng báo "Mã tra cứu: 7f3a21c0" thì tìm đúng dòng log (Buổi 11).
const crypto = require('crypto');

function requestContext(req, res, next) {
  req.requestId = crypto.randomUUID().slice(0, 8);
  res.set('X-Request-Id', req.requestId);
  next();
}

module.exports = { requestContext };
