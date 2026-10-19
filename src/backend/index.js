// Điểm khởi động backend: npm start
const env = require('./config/env');
const { createPool } = require('./db/pool');
const { buildServices } = require('./container');
const { createApp } = require('./app');

const db = createPool();
db.on('error', (err) => console.error('[db pool]', err.message)); // CSDL rớt kết nối không làm sập tiến trình
const app = createApp({ services: buildServices(db), db });

app.listen(env.appPort, () => {
  console.log(`Smart CRM L8 API chạy tại http://localhost:${env.appPort}`);
});
