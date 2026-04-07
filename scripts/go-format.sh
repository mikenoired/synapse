#!/bin/sh

set -eu

cd "$(dirname "$0")/../services/thumbnail-service"
gofmt -w .
go run golang.org/x/tools/cmd/goimports@v0.38.0 -w .
