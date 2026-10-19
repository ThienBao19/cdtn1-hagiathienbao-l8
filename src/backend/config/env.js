// Đọc cấu hình từ .env ở thư mục gốc repo. Mọi cấu hình đi qua biến môi trường (không ghi cứng trong mã).
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

module.exports = {
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'smartcrm',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },
  appPort: Number(process.env.APP_PORT || 3000),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  invitationValidDays: Number(process.env.INVITATION_VALID_DAYS || 7), // BR-L8-01
};
