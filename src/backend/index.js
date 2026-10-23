// Điểm khởi động backend: npm start
const env = require('./config/env');
const { createPool } = require('./db/pool');
const { buildServices } = require('./container');
const { createApp } = require('./app');

// Thiếu khoá ký JWT thì dừng ngay với thông báo rõ ràng, không chạy nửa vời rồi lỗi khi đăng nhập.
if (!env.secretKey || env.secretKey.length < 16) {
  console.error('Thiếu SECRET_KEY (tối thiểu 16 ký tự) trong .env – xem .env.example rồi chạy lại npm start.');
  process.exit(1);
}

const db = createPool();
db.on('error', (err) => console.error('[db pool]', err.message)); // CSDL rớt kết nối không làm sập tiến trình
const app = createApp({ services: buildServices(db), db });

app.listen(env.appPort, () => {
  console.log(`Smart CRM L8 API chạy tại http://localhost:${env.appPort}`);
});
