# ==========================================
# Stage 1: 构建阶段
# ==========================================
FROM node:20-alpine AS builder

# 设置工作目录
WORKDIR /app

# 安装pnpm
RUN npm install -g pnpm@10

# 复制package配置文件
COPY package.json pnpm-lock.yaml ./

# 安装依赖（包括开发依赖，用于构建）
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建应用
RUN pnpm build

# 清理开发依赖，只保留生产依赖
RUN pnpm install --prod --frozen-lockfile

# ==========================================
# Stage 2: 生产运行阶段
# ==========================================
FROM node:20-alpine

# 安装dumb-init（优雅处理进程信号）和 pnpm（用于容器启动时运行 migration）
RUN apk add --no-cache dumb-init && npm install -g pnpm@10

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# 设置工作目录
WORKDIR /app

# 从构建阶段复制文件
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

# 创建日志目录
RUN mkdir -p /app/logs && chown nodejs:nodejs /app/logs

# 切换到非root用户
USER nodejs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/healthz', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

# 使用dumb-init启动应用
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]
