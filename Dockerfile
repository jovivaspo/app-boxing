# Build stage
FROM node:20-bullseye-slim AS builder

WORKDIR /app

# NEXT_PUBLIC_* vars are inlined into the client bundle at build time,
# so they must be passed as build args, not just runtime env vars.
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID

# Install dependencies and build the app
COPY package*.json ./
COPY tsconfig.json ./
COPY next.config.ts ./
COPY postcss.config.mjs ./
COPY .prettierrc ./
COPY eslint.config.mjs ./
COPY .env.example ./
COPY public ./public
COPY src ./src

RUN npm ci
RUN npm run build

# Runtime stage
FROM node:20-bullseye-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
EXPOSE 3000

# Copy the standalone output from the builder
COPY --from=builder /app/.next/standalone .
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Install only production dependencies from the standalone package manifest
COPY --from=builder /app/.next/standalone/package.json ./package.json
COPY package-lock.json ./package-lock.json
RUN npm ci --omit=dev

CMD ["node", "server.js"]

# Development stage — hot reload, source mounted as a volume via docker-compose.
# Build/run with: docker compose up
FROM node:20-bullseye-slim AS dev

WORKDIR /app

COPY package*.json ./
RUN npm ci

EXPOSE 3000

# -H 0.0.0.0 is required: Next's dev server only binds to loopback by
# default, which Docker's port mapping can't reach from outside the
# container's network namespace.
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0"]
