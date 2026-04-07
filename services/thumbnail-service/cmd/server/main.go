package main

import (
	"context"
	"errors"
	"os"
	"os/signal"
	"syscall"

	"github.com/sirupsen/logrus"

	"thumbnail-service/internal/config"
	"thumbnail-service/internal/server"
)

func main() {
	logger := logrus.New()
	logger.SetFormatter(&logrus.JSONFormatter{})
	logger.SetLevel(logrus.InfoLevel)

	cfg := config.Load()

	logger.WithFields(logrus.Fields{
		"grpc_port":           cfg.GRPCPort,
		"redis_host":          cfg.RedisHost,
		"redis_port":          cfg.RedisPort,
		"minio_endpoint":      cfg.MinIOEndpoint,
		"max_concurrent_jobs": cfg.MaxConcurrentJobs,
	}).Info("Starting thumbnail service")

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		if err := server.StartGRPCServer(ctx, cfg, logger); err != nil && !errors.Is(err, context.Canceled) {
			logger.WithError(err).Fatal("Failed to start gRPC server")
		}
	}()

	<-sigChan
	logger.Info("Received shutdown signal")

	cancel()

	logger.Info("Thumbnail service stopped")
}
