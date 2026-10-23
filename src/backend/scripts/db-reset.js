// npm run db:reset – xoá 6 bảng của L8 rồi migrate + seed lại từ đầu (dùng khi muốn dữ liệu mẫu "mới").
const { Client } = require('pg');
const env = require('../config/env');
const { migrate } = require('./migrate');
const { seed } = require('./seed');

async function reset() {
  const client = new Client({ ...env.db, connectionTimeoutMillis: 3000 });
  await client.connect();
  try {
    await client.query(`DROP TABLE IF EXISTS app_user, survey_response, survey_invitation, ticket, customer,
                        technician, service_center, schema_migrations CASCADE`);
    console.log('Đã xoá các bảng cũ.');
  } finally {
    await client.end();
  }
  await migrate();
  await seed();
}

reset().catch((err) => {
  console.error(`Lỗi reset: ${err.message}`);
  process.exit(1);
});
