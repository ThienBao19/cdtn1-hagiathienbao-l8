// Đọc "Authorization: Bearer <token>", giải mã bằng AuthService, gắn req.user cho controller phía sau.
// Phân quyền theo vai trò/trung tâm (QT-14) là quy tắc nghiệp vụ nên nằm ở service, không ở đây.
function requireAuth(authService) {
  return (req, res, next) => {
    try {
      const header = req.get('Authorization') || '';
      const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
      req.user = authService.verify(token);
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { requireAuth };
