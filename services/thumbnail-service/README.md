# Thumbnail Service

## Architecture

```
┌─────────────────┐    gRPC     ┌──────────────────┐
│   Main Service  │ ──────────► │ Thumbnail Service│
│   (Node.js)     │             │     (Go)         │
└─────────────────┘             └──────────────────┘
         │                                │
         │ Redis Queue                    │
         ▼                                ▼
┌─────────────────┐             ┌──────────────────┐
│   Redis Queue   │ ◄───────────│   Worker Process │
└─────────────────┘             └──────────────────┘
```

## Quick start

### Local dev

1. **Download deps:**
   ```bash
   make deps
   ```

2. **Generate proto files:**
   ```bash
   make proto
   ```

3. **Build:**
   ```bash
   make build
   ```

4. **Run gRPC server:**
   ```bash
   make run-server
   ```

5. **Run worker (in separated terminal):**
   ```bash
   make run-worker
   ```

### Docker

1. **Build Docker image:**
   ```bash
   make docker-build
   ```

2. **Run container:**
   ```bash
   make docker-run
   ```

## Config

Service is configuring by using this values:

| Variable | Default |
|------------|--------------|
| `GRPC_PORT` | `50051` |
| `REDIS_HOST` | `localhost` |
| `REDIS_PORT` | `6379` |
| `REDIS_PASSWORD` | `` |
| `MINIO_ENDPOINT` | `localhost:9000` |
| `MINIO_ACCESS_KEY` | `minioadmin` |
| `MINIO_SECRET_KEY` | `minioadmin` |
| `MINIO_USE_SSL` | `false` |
| `MINIO_BUCKET_NAME` | `synapse` |
| `MAX_CONCURRENT_JOBS` | `10` |
| `MAX_IMAGE_SIZE` | `52428800` |
| `MAX_VIDEO_SIZE` | `524288000` |
| `DEFAULT_THUMBNAIL_WIDTH` | `20` |
| `DEFAULT_THUMBNAIL_HEIGHT` | `0` |
| `DEFAULT_JPEG_QUALITY` | `40` |

## API

### gRPC methods

#### GenerateImageThumbnail

```protobuf
rpc GenerateImageThumbnail(ImageThumbnailRequest) returns (ThumbnailResponse);
```

#### GenerateVideoThumbnail

```protobuf
rpc GenerateVideoThumbnail(VideoThumbnailRequest) returns (ThumbnailResponse);
```

#### GetImageDimensions

```protobuf
rpc GetImageDimensions(ImageDimensionsRequest) returns (ImageDimensionsResponse);
```

## Development

### Service structure

```
services/thumbnail-service/
├── cmd/                    # Entry points
│   ├── server/            # gRPC server
│   └── worker/            # Redis worker
├── internal/              # Internal packages
│   ├── config/           # Config
│   ├── queue/            # Redis queue
│   ├── server/           # gRPC server
│   └── thumbnail/        # Image/video processing
├── proto/                # Protocol Buffers
├── Dockerfile
├── Makefile
└── README.md
```

### Add new formats

1. Add support in `internal/thumbnail/processor.go`
2. Update proto files if it needs
3. Add tests
4. Update docs
5. You're perfect!
