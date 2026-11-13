# Backend API – Node.js 20 (ghim phiên bản ảnh nền, không dùng :latest)
FROM node:20-alpine
WORKDIR /app/src/backend
# Chép tệp khoá TRƯỚC rồi cài: Docker dùng lại lớp này nếu thư viện không đổi (Buổi 11, 15)
COPY src/backend/package.json src/backend/package-lock.json ./
# BT3: chạy được bộ kiểm thử TRONG container (docker compose exec api npm test) nên cài cả devDependencies (jest, supertest)
RUN npm ci
COPY src/backend/ ./
# Script migrate/seed đọc ../../../migrations và ../../../seeds; Jest có rootDir ../.. -> đặt tất cả dưới /app
COPY migrations /app/migrations
COPY seeds /app/seeds
COPY tests /app/tests
# Không chạy bằng root
USER node
EXPOSE 3000
# /health kiểm cả CSDL: CSDL không trả lời -> 503 -> container "unhealthy"
HEALTHCHECK --interval=5s --timeout=3s --start-period=20s --retries=10 CMD wget -qO- http://localhost:3000/health || exit 1
# Mỗi lần khởi động: migrate + seed (chạy lại không lỗi, không nhân đôi – C8) rồi mới mở API
CMD ["sh", "-c", "node scripts/migrate.js && node scripts/seed.js && node index.js"]
