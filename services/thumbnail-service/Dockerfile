FROM oven/bun:1.3.14-alpine

RUN apk add --no-cache ffmpeg
WORKDIR /app
COPY package.json ./
RUN bun install --production
COPY proto ./proto
COPY src ./src

USER bun
EXPOSE 50051
CMD ["bun", "src/server.ts"]
