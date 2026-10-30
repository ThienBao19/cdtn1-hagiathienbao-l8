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
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
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
