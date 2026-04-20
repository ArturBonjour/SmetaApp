FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Build main application
RUN npm run build
# Compile seed script separately (uses tsconfig.seed.json with rootDir=./)
RUN node_modules/.bin/tsc -p tsconfig.seed.json

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma
RUN mkdir -p /app/data
EXPOSE 3001
# 1. Apply DB schema, 2. Seed system data (ignore errors if already seeded), 3. Start server
CMD ["sh", "-c", "node_modules/.bin/prisma db push && node dist/prisma/seed.js || true && node dist/app.js"]
