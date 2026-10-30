# Backend API – Node.js 20 (ghim phiên bản ảnh nền, không dùng :latest)
FROM node:20-alpine
WORKDIR /app/src/backend
# Chép tệp khoá TRƯỚC rồi cài: Docker dùng lại lớp này nếu thư viện không đổi (Buổi 11)
COPY src/backend/package.json src/backend/package-lock.json ./
RUN npm ci --omit=dev
COPY src/backend/ ./
# Script migrate/seed đọc ../../../migrations và ../../../seeds -> đặt ở /app
COPY migrations /app/migrations
COPY seeds /app/seeds
USER node
EXPOSE 3000
HEALTHCHECK --interval=5s --timeout=3s --retries=10 CMD wget -qO- http://localhost:3000/health || exit 1
# Mỗi lần khởi động: migrate + seed (chạy lại không lỗi, không nhân đôi – C5) rồi mới mở API
CMD ["sh", "-c", "node scripts/migrate.js && node scripts/seed.js && node index.js"]
