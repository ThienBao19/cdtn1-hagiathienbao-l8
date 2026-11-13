// Tạo ứng dụng Express từ các service đã nối sẵn (test có thể truyền service dùng repository giả).
const express = require('express');
const { createApiRouter } = require('./routes');
const { createErrorHandler, notFoundHandler } = require('./middlewares/error-handler');
const { requestContext } = require('./middlewares/request-context');

function createApp({ services, db, logger }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(requestContext);
  app.use(express.json({ limit: '20kb' }));

  app.get('/', (req, res) => res.send('Hello Smart CRM – L8 CSAT/NPS'));
  // Kiểm tra sức khoẻ cho Docker healthcheck và người chấm (Deployment Guide mục 5): app sống VÀ CSDL trả lời được.
  // CSDL không trả lời -> 503 để docker compose ps hiện "unhealthy" thay vì "healthy" giả.
  app.get('/health', async (req, res) => {
    try {
      await db.query('SELECT 1');
      res.json({ status: 'ok', db: 'up' });
    } catch {
      res.status(503).json({ status: 'degraded', db: 'down' });
    }
  });
  app.get('/db-check', async (req, res, next) => {
    try {
      const r = await db.query('SELECT NOW() AS server_time');
      res.json({ status: 'OK', ...r.rows[0] });
    } catch (err) { next(err); }
  });

  app.use('/api', createApiRouter(services));
  app.use(notFoundHandler);
  app.use(createErrorHandler(logger));
  return app;
}

module.exports = { createApp };
