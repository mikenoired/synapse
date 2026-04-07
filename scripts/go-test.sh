#!/bin/sh

set -eu

cd "$(dirname "$0")/../services/thumbnail-service"
go test ./...
