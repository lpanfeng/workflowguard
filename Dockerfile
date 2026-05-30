# ====================
# WorkflowGuard — Production Dockerfile
# 多阶段构建: deps → builder → runner
# ====================

# ---- Stage 1: Dependencies ----
FROM node:22-alpine AS deps
LABEL stage=workflowguard-deps

RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production --ignore-scripts

# ---- Stage 2: Builder ----
FROM node:22-alpine AS builder
LABEL stage=workflowguard-builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 构建（需要 devDependencies）
RUN npm run build

# ---- Stage 3: Runner ----
FROM node:22-alpine AS runner
LABEL stage=workflowguard-runner

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set correct permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
