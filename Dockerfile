# ─────────────────────────────────────────────────────────────
# Stage 1: deps — install ALL dependencies (incl. dev) once.
# ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ─────────────────────────────────────────────────────────────
# Stage 2: development — full toolchain, used by docker-compose.override
#          for hot-reload. Not used by the production image.
# ─────────────────────────────────────────────────────────────
FROM deps AS development
WORKDIR /app
ENV NODE_ENV=development
ENV TZ=UTC
COPY . .
CMD ["npm", "run", "start:dev"]

# ─────────────────────────────────────────────────────────────
# Stage 3: builder — compile TypeScript to dist, then drop dev deps.
# ─────────────────────────────────────────────────────────────
FROM deps AS builder
WORKDIR /app
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build
RUN npm prune --omit=dev

# ─────────────────────────────────────────────────────────────
# Stage 4: runner — slim production image, runs compiled dist only.
# ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV TZ=UTC
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
EXPOSE 8080
CMD ["node", "dist/main.js"]
