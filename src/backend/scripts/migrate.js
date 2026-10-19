// npm run migrate – tạo CSDL (nếu chưa có) rồi chạy lần lượt migrations/*.sql CHƯA chạy.
// Chạy lại lần 2 không lỗi: file đã chạy được ghi trong bảng schema_migrations và bị bỏ qua.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const env = require('../config/env');

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../migrations');

async function ensureDatabase() {
  const admin = new Client({ ...env.db, database: 'postgres', connectionTimeoutMillis: 3000 });
  await admin.connect();
  try {
    const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [env.db.database]);
    if (rowCount === 0) {
      await admin.query(`CREATE DATABASE "${env.db.database.replace(/"/g, '')}"`);
      console.log(`Đã tạo CSDL ${env.db.database}`);
    }
  } finally {
    await admin.end();
  }
}

async function migrate() {
  await ensureDatabase();
  const client = new Client({ ...env.db, connectionTimeoutMillis: 3000 });
  await client.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   VARCHAR(200) PRIMARY KEY,
      applied_at TIMESTAMPTZ  NOT NULL DEFAULT now())`);
    const done = new Set((await client.query('SELECT filename FROM schema_migrations')).rows.map((r) => r.filename));
    const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
    let applied = 0;
    for (const file of files) {
      if (done.has(file)) { console.log(`  bỏ qua  ${file} (đã chạy)`); continue; }
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`  đã chạy ${file}`);
        applied += 1;
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file} lỗi: ${err.message}`);
      }
    }
    console.log(`Migration xong: ${applied} file mới, ${files.length - applied} file đã có.`);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  migrate().catch((err) => {
    console.error(`Lỗi migration: ${err.message}`);
    console.error('Kiểm tra PostgreSQL đã chạy và DB_HOST/DB_PORT/DB_USER/DB_PASSWORD trong .env.');
    process.exit(1);
  });
}

module.exports = { migrate };
