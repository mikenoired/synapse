#!/bin/bash

set -e

echo "🔧 Генерация proto файлов..."

if ! command -v protoc &> /dev/null; then
    echo "❌ protoc не найден. Установите Protocol Buffers compiler"
    echo "   macOS: brew install protobuf"
    echo "   Ubuntu: apt-get install protobuf-compiler"
    exit 1
fi

if ! command -v protoc-gen-go &> /dev/null; then
    echo "📦 Устанавливаем protoc-gen-go..."
    go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
fi

if ! command -v protoc-gen-go-grpc &> /dev/null; then
    echo "📦 Устанавливаем protoc-gen-go-grpc..."
    go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
fi

if ! command -v protoc-gen-ts &> /dev/null; then
    echo "📦 Устанавливаем protoc-gen-ts..."
    npm install -g grpc-tools
fi

echo "🔨 Генерация Go кода..."
cd services/thumbnail-service
protoc --go_out=. --go_opt=paths=source_relative \
    --go-grpc_out=. --go-grpc_opt=paths=source_relative \
    proto/thumbnail.proto

echo "🔨 Генерация TypeScript кода..."
cd ../../apps/web
mkdir -p src/shared/api/generated
protoc --plugin=./node_modules/.bin/protoc-gen-ts_proto \
    --ts_proto_out=./src/shared/api/generated \
    --ts_proto_opt=esModuleInterop=true,useExactTypes=false \
    ../../services/thumbnail-service/proto/thumbnail.proto

echo "✅ Proto файлы успешно сгенерированы!"
echo "   Go код: services/thumbnail-service/proto/"
echo "   TypeScript код: apps/web/src/shared/api/generated/"
