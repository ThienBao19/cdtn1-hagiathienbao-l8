// npm run seed – nạp dữ liệu mẫu seeds/*.sql. Chạy lại không nhân đôi (ON CONFLICT DO NOTHING).
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const env = require('../config/env');

const SEEDS_DIR = path.resolve(__dirname, '../../../seeds');
const TABLES = ['service_center', 'technician', 'customer', 'ticket', 'survey_invitation', 'survey_response'];

async function seed() {
  const client = new Client({ ...env.db, connectionTimeoutMillis: 3000 });
  await client.connect();
  try {
    for (const file of fs.readdirSync(SEEDS_DIR).filter((f) => f.endsWith('.sql')).sort()) {
      await client.query('BEGIN');
      try {
        await client.query(fs.readFileSync(path.join(SEEDS_DIR, file), 'utf8'));
        await client.query('COMMIT');
        console.log(`  đã nạp ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Seed ${file} lỗi: ${err.message}`);
      }
    }
    for (const t of TABLES) {
      const { rows } = await client.query(`SELECT COUNT(*)::int AS n FROM ${t}`);
      console.log(`  ${t.padEnd(18)} ${rows[0].n} dòng`);
    }
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  seed().catch((err) => {
    console.error(`Lỗi seed: ${err.message}`);
    console.error('Đã chạy "npm run migrate" trước chưa?');
    process.exit(1);
  });
}

module.exports = { seed };
