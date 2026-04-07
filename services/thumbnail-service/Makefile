.PHONY: help build build-server build-worker run-server run-worker clean proto test docker-build docker-run deps lint fmt fmt-check security

BINARY_NAME=thumbnail-service
SERVER_BINARY=thumbnail-server
WORKER_BINARY=thumbnail-worker
DOCKER_IMAGE=synapse/thumbnail-service
DOCKER_TAG=latest
PROTOC_GEN_GO_VERSION=v1.36.6
PROTOC_GEN_GO_GRPC_VERSION=v1.5.1
GOLANGCI_LINT_VERSION=v1.64.8
GOIMPORTS_VERSION=v0.38.0

help:
	@echo "Available commands:"
	@echo "  build          - Build all binaries"
	@echo "  build-server   - Build gRPC server"
	@echo "  build-worker   - Build worker"
	@echo "  run-server     - Run gRPC server"
	@echo "  run-worker     - Run worker"
	@echo "  proto          - Generate Go code from proto files"
	@echo "  test           - Run tests"
	@echo "  clean          - Clean built files"
	@echo "  docker-build   - Build Docker image"
	@echo "  docker-run     - Run Docker container"

proto:
	@echo "Generating Go code from proto files..."
	go install google.golang.org/protobuf/cmd/protoc-gen-go@$(PROTOC_GEN_GO_VERSION)
	go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@$(PROTOC_GEN_GO_GRPC_VERSION)
	protoc --go_out=. --go_opt=paths=source_relative \
		--go-grpc_out=. --go-grpc_opt=paths=source_relative \
		--plugin=protoc-gen-go=$(shell go env GOPATH)/bin/protoc-gen-go \
		--plugin=protoc-gen-go-grpc=$(shell go env GOPATH)/bin/protoc-gen-go-grpc \
		proto/thumbnail.proto

build: proto build-server build-worker

build-server: proto
	@echo "Building gRPC server..."
	go build -o bin/$(SERVER_BINARY) cmd/server/main.go

build-worker: proto
	@echo "Building worker..."
	go build -o bin/$(WORKER_BINARY) cmd/worker/main.go

run-server: build-server
	@echo "Starting gRPC server..."
	./bin/$(SERVER_BINARY)

run-worker: build-worker
	@echo "Starting worker..."
	./bin/$(WORKER_BINARY)

test:
	@echo "Running tests..."
	go test -v ./...

clean:
	@echo "Cleaning up..."
	rm -rf bin/
	go clean

docker-build:
	@echo "Building Docker image..."
	docker build -t $(DOCKER_IMAGE):$(DOCKER_TAG) .

docker-run:
	@echo "Running Docker container..."
	docker run -p 50051:50051 \
		-e REDIS_HOST=host.docker.internal \
		-e REDIS_PORT=6379 \
		-e MINIO_ENDPOINT=host.docker.internal:9000 \
		$(DOCKER_IMAGE):$(DOCKER_TAG)

deps:
	@echo "Installing dependencies..."
	go mod tidy
	go mod download

lint:
	@echo "Running linter..."
	go run github.com/golangci/golangci-lint/cmd/golangci-lint@$(GOLANGCI_LINT_VERSION) run --config ../../.golangci.yml ./...

fmt:
	@echo "Formatting code..."
	gofmt -w .
	go run golang.org/x/tools/cmd/goimports@$(GOIMPORTS_VERSION) -w .

fmt-check:
	@echo "Checking formatting..."
	@test -z "$$(gofmt -l .)"
	@test -z "$$(go run golang.org/x/tools/cmd/goimports@$(GOIMPORTS_VERSION) -l .)"

security:
	@echo "Running security check..."
	gosec ./...
