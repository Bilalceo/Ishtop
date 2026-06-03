# =============================================================================
# CareerUZ - Frontend Dockerfile (PRODUCTION)
# =============================================================================
# Multi-stage build with Next.js standalone output

# --- Stage 1: Dependencies ---
FROM node:18-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile

# --- Stage 2: Builder ---
FROM node:18-alpine AS builder
WORKDIR /app

# Build-time public envs for Next.js.
# Railway Docker builds may not inject service vars automatically into `next build`,
# so we provide sane defaults and allow override via build args.
ARG NEXT_PUBLIC_API_URL="https://careeruz-backend-production-fe34.up.railway.app/api/v1"
ARG NEXT_PUBLIC_FRONTEND_URL="https://careeruz-frontend-production-f5c1.up.railway.app"

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Ensure public directory exists so runtime COPY step is stable
# even when the project has no static assets committed yet.
RUN mkdir -p /app/public

# Build the application
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_FRONTEND_URL=${NEXT_PUBLIC_FRONTEND_URL}
RUN npm run build && ls -la /app/.next/

# --- Stage 3: Runtime ---
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy only necessary files for standalone
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget -qO- http://localhost:3000/ 2>/dev/null || exit 1

# Use standalone server (much faster startup, smaller footprint)
CMD ["node", "server.js"]
