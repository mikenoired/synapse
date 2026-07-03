FROM oven/bun:1.3.14-debian AS deps

WORKDIR /app

COPY package.json bun.lock ./
COPY apps/web/package.json apps/web/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json
COPY packages/ui/package.json packages/ui/package.json

RUN bun install --frozen-lockfile

FROM deps AS builder

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV POSTGRES_USER=postgres
ENV POSTGRES_PASSWORD=postgres
ENV POSTGRES_HOST=localhost
ENV POSTGRES_DB=synapse
ENV POSTGRES_PORT=5432
ENV MINIO_ENDPOINT=localhost:9000
ENV MINIO_ACCESS_KEY=minioadmin
ENV MINIO_SECRET_KEY=minioadmin
ENV MINIO_BUCKET_NAME=synapse
ENV REDIS_HOST=localhost
ENV REDIS_PORT=6379
ENV JWT_SECRET=build-time-secret
ENV JWT_REFRESH_SECRET=build-time-refresh-secret

COPY . .
RUN bun --filter @synapse/web build

FROM oven/bun:1.3.14-debian AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app ./

EXPOSE 3000

CMD ["bun", "--filter", "@synapse/web", "start"]
