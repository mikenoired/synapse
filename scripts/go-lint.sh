#!/bin/sh

set -eu

cd "$(dirname "$0")/../services/thumbnail-service"
go run github.com/golangci/golangci-lint/cmd/golangci-lint@v1.64.8 run --config ../../.golangci.yml ./...
