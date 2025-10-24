FROM golang:1.24-alpine AS builder

RUN apk add --no-cache \
  git \
  make \
  protobuf \
  protobuf-dev

RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
RUN go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY go.mod go.sum ./

RUN go mod download

COPY . .

RUN protoc --go_out=. --go_opt=paths=source_relative \
  --go-grpc_out=. --go-grpc_opt=paths=source_relative \
  proto/thumbnail.proto

RUN go build -o bin/thumbnail-server cmd/server/main.go
RUN go build -o bin/thumbnail-worker cmd/worker/main.go

FROM alpine:latest

RUN apk add --no-cache \
  ca-certificates \
  ffmpeg \
  tzdata

RUN adduser -D -s /bin/sh appuser

WORKDIR /app

COPY --from=builder /app/bin/thumbnail-server ./thumbnail-server
COPY --from=builder /app/bin/thumbnail-worker ./thumbnail-worker

RUN chown -R appuser:appuser /app
USER appuser

EXPOSE 50051

ENV GRPC_PORT=50051
ENV REDIS_HOST=redis
ENV REDIS_PORT=6379
ENV MINIO_ENDPOINT=minio:9000
ENV MINIO_ACCESS_KEY=minioadmin
ENV MINIO_SECRET_KEY=minioadmin
ENV MINIO_USE_SSL=false
ENV MINIO_BUCKET_NAME=synapse
ENV MAX_CONCURRENT_JOBS=10
ENV MAX_IMAGE_SIZE=52428800
ENV MAX_VIDEO_SIZE=524288000
ENV DEFAULT_THUMBNAIL_WIDTH=20
ENV DEFAULT_THUMBNAIL_HEIGHT=0
ENV DEFAULT_JPEG_QUALITY=40

CMD ["./thumbnail-server"]
