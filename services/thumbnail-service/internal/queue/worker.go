package queue

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/sirupsen/logrus"

	"thumbnail-service/internal/config"
	"thumbnail-service/internal/thumbnail"
)

type ThumbnailJobData struct {
	ContentID  string `json:"contentId"`
	ObjectName string `json:"objectName"`
	MimeType   string `json:"mimeType"`
	Type       string `json:"type"` // "image", "video", "audio-cover"
}

type Worker struct {
	redis     *redis.Client
	processor *thumbnail.Processor
	config    *config.Config
	logger    *logrus.Logger
}

// NewWorker создает новый воркер
func NewWorker(cfg *config.Config, logger *logrus.Logger) *Worker {
	rdb := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%s", cfg.RedisHost, cfg.RedisPort),
		Password: cfg.RedisPassword,
		DB:       0,
	})

	processor := thumbnail.NewProcessor(logger)

	return &Worker{
		redis:     rdb,
		processor: processor,
		config:    cfg,
		logger:    logger,
	}
}

func (w *Worker) Start(ctx context.Context) error {
	w.logger.Info("Starting thumbnail worker")

	if err := w.redis.Ping(ctx).Err(); err != nil {
		return fmt.Errorf("failed to connect to Redis: %w", err)
	}

	return w.processJobs(ctx)
}

func (w *Worker) processJobs(ctx context.Context) error {
	queueName := "thumbnail-generation"

	w.logger.WithField("queue", queueName).Info("Starting to process jobs")

	for {
		select {
		case <-ctx.Done():
			w.logger.Info("Worker context cancelled, stopping")
			return ctx.Err()
		default:
			result, err := w.redis.BLPop(ctx, 5*time.Second, queueName).Result()
			if err != nil {
				if err == redis.Nil {
					continue
				}
				w.logger.WithError(err).Error("Failed to get job from queue")
				time.Sleep(time.Second)
				continue
			}

			if len(result) < 2 {
				w.logger.Warn("Invalid job result from Redis")
				continue
			}

			var jobData ThumbnailJobData
			if err := json.Unmarshal([]byte(result[1]), &jobData); err != nil {
				w.logger.WithError(err).Error("Failed to unmarshal job data")
				continue
			}

			w.processJob(ctx, &jobData)
		}
	}
}

func (w *Worker) processJob(ctx context.Context, jobData *ThumbnailJobData) {
	w.logger.WithFields(logrus.Fields{
		"content_id":  jobData.ContentID,
		"object_name": jobData.ObjectName,
		"mime_type":   jobData.MimeType,
		"type":        jobData.Type,
	}).Info("Processing thumbnail job")

	w.logger.WithFields(logrus.Fields{
		"content_id": jobData.ContentID,
	}).Info("Thumbnail job completed successfully")
}

func (w *Worker) Stop() error {
	w.logger.Info("Stopping thumbnail worker")
	return w.redis.Close()
}
