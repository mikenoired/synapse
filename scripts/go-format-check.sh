#!/bin/sh

set -eu

cd "$(dirname "$0")/../services/thumbnail-service"

gofmt_diff=$(gofmt -l .)
if [ -n "$gofmt_diff" ]; then
	printf '%s\n' "$gofmt_diff"
	exit 1
fi

goimports_diff=$(go run golang.org/x/tools/cmd/goimports@v0.38.0 -l .)
if [ -n "$goimports_diff" ]; then
	printf '%s\n' "$goimports_diff"
	exit 1
fi
