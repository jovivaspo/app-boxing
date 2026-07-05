# Build stage
FROM node:20-bullseye-slim AS builder

WORKDIR /app

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
