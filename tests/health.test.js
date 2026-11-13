// GET /health – dùng cho healthcheck của Docker và mục "Verify it works" của Deployment Guide (BT3).
const request = require('supertest');
const { createApp } = require('../src/backend/app');

const silent = { info() {}, warn() {}, error() {}, debug() {} };
const appWith = (db) => createApp({ services: { surveyService: {} }, db, logger: silent });

test('[Luồng đúng] CSDL trả lời -> 200 {"status":"ok","db":"up"}', async () => {
  const res = await request(appWith({ query: async () => ({ rows: [{ '?column?': 1 }] }) })).get('/health');
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ status: 'ok', db: 'up' });
});

test('[Dữ liệu sai] CSDL tắt -> 503 {"status":"degraded","db":"down"}, không lộ chi tiết lỗi', async () => {
  const down = { query: async () => { const e = new Error('connect ECONNREFUSED 127.0.0.1:5432'); e.code = 'ECONNREFUSED'; throw e; } };
  const res = await request(appWith(down)).get('/health');
  expect(res.status).toBe(503);
  expect(res.body).toEqual({ status: 'degraded', db: 'down' });
  expect(JSON.stringify(res.body)).not.toMatch(/ECONNREFUSED|5432/);
});
