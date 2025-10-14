package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"github.com/sirupsen/logrus"

	"thumbnail-service/internal/config"
	"thumbnail-service/internal/queue"
)

func main() {
	logger := logrus.New()
	logger.SetFormatter(&logrus.JSONFormatter{})
	logger.SetLevel(logrus.InfoLevel)

	cfg := config.Load()

	logger.WithFields(logrus.Fields{
		"redis_host":          cfg.RedisHost,
		"redis_port":          cfg.RedisPort,
		"max_concurrent_jobs": cfg.MaxConcurrentJobs,
	}).Info("Starting thumbnail worker")

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	worker := queue.NewWorker(cfg, logger)

	go func() {
		if err := worker.Start(ctx); err != nil {
			logger.WithError(err).Fatal("Worker failed")
		}
	}()

	<-sigChan
	logger.Info("Received shutdown signal")

	cancel()

	if err := worker.Stop(); err != nil {
		logger.WithError(err).Error("Failed to stop worker gracefully")
	}

	logger.Info("Thumbnail worker stopped")
}
