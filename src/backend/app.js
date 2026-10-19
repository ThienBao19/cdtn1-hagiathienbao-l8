// Tạo ứng dụng Express từ các service đã nối sẵn (test có thể truyền service dùng repository giả).
const express = require('express');
const { createApiRouter } = require('./routes');
const { errorHandler, notFoundHandler } = require('./middlewares/error-handler');

function createApp({ services, db }) {
  const app = express();
  app.use(express.json({ limit: '20kb' }));

  app.get('/', (req, res) => res.send('Hello Smart CRM – L8 CSAT/NPS'));
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.get('/db-check', async (req, res, next) => {
    try {
      const r = await db.query('SELECT NOW() AS server_time');
      res.json({ status: 'OK', ...r.rows[0] });
    } catch (err) { next(err); }
  });

  app.use('/api', createApiRouter(services));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
