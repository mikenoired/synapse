package queue

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/sirupsen/logrus"

	"thumbnail-service/internal/config"
	"thumbnail-service/internal/persistence"
	"thumbnail-service/internal/storage"
	"thumbnail-service/internal/thumbnail"
)

const thumbnailQueueName = "thumbnail-generation"

type ThumbnailJobData struct {
	ContentID  string `json:"contentId"`
	ObjectName string `json:"objectName"`
	MimeType   string `json:"mimeType"`
	Type       string `json:"type"` // "image", "video", "audio-cover"
	Attempts   int    `json:"attempts,omitempty"`
}

type Worker struct {
	config       *config.Config
	contentStore *persistence.ContentStore
	logger       *logrus.Logger
	objectStore  *storage.ObjectStore
	processor    *thumbnail.Processor
	redis        *redis.Client
}

func NewWorker(ctx context.Context, cfg *config.Config, logger *logrus.Logger) (*Worker, error) {
	rdb := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%s", cfg.RedisHost, cfg.RedisPort),
		Password: cfg.RedisPassword,
		DB:       0,
	})

	objectStore, err := storage.NewObjectStore(cfg)
	if err != nil {
		return nil, fmt.Errorf("create object store: %w", err)
	}

	contentStore, err := persistence.NewContentStore(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("create content store: %w", err)
	}

	processor := thumbnail.NewProcessor(logger)

	return &Worker{
		config:       cfg,
		contentStore: contentStore,
		logger:       logger,
		objectStore:  objectStore,
		processor:    processor,
		redis:        rdb,
	}, nil
}

func (w *Worker) Start(ctx context.Context) error {
	w.logger.Info("Starting thumbnail worker")

	if err := w.redis.Ping(ctx).Err(); err != nil {
		return fmt.Errorf("failed to connect to Redis: %w", err)
	}
	if err := w.contentStore.Ping(ctx); err != nil {
		return fmt.Errorf("failed to connect to Postgres: %w", err)
	}

	return w.processJobs(ctx)
}

func (w *Worker) processJobs(ctx context.Context) error {
	queueName := thumbnailQueueName
	maxWorkers := w.config.MaxConcurrentJobs
	if maxWorkers < 1 {
		maxWorkers = 1
	}

	semaphore := make(chan struct{}, maxWorkers)
	var waitGroup sync.WaitGroup

	w.logger.WithField("queue", queueName).Info("Starting to process jobs")

	defer waitGroup.Wait()

	for {
		select {
		case <-ctx.Done():
			w.logger.Info("Worker context cancelled, stopping")
			return nil
		default:
			result, err := w.redis.BLPop(ctx, 5*time.Second, queueName).Result()
			if err != nil {
				if err == redis.Nil || ctx.Err() != nil {
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

			semaphore <- struct{}{}
			waitGroup.Add(1)

			go func(job ThumbnailJobData) {
				defer waitGroup.Done()
				defer func() { <-semaphore }()

				if err := w.processJob(ctx, &job); err != nil {
					w.handleJobFailure(ctx, &job, err)
				}
			}(jobData)
		}
	}
}

func (w *Worker) processJob(ctx context.Context, jobData *ThumbnailJobData) error {
	w.logger.WithFields(logrus.Fields{
		"content_id":  jobData.ContentID,
		"object_name": jobData.ObjectName,
		"mime_type":   jobData.MimeType,
		"type":        jobData.Type,
	}).Info("Processing thumbnail job")

	objectData, err := w.objectStore.GetObject(ctx, jobData.ObjectName)
	if err != nil {
		return fmt.Errorf("load object from storage: %w", err)
	}

	thumbnailBase64, err := w.generateThumbnail(ctx, jobData, objectData)
	if err != nil {
		return err
	}

	if err := w.contentStore.UpdateThumbnail(ctx, jobData.ContentID, jobData.Type, thumbnailBase64); err != nil {
		return fmt.Errorf("persist thumbnail: %w", err)
	}

	w.logger.WithFields(logrus.Fields{
		"content_id": jobData.ContentID,
	}).Info("Thumbnail job completed successfully")

	return nil
}

func (w *Worker) generateThumbnail(ctx context.Context, jobData *ThumbnailJobData, objectData []byte) (string, error) {
	result, err := w.processor.ProcessImage(
		ctx,
		objectData,
		jobData.MimeType,
		w.config.DefaultThumbnailWidth,
		w.config.DefaultThumbnailHeight,
		w.config.DefaultJPEGQuality,
	)
	if jobData.Type == "video" {
		result, err = w.processor.ProcessVideo(
			ctx,
			objectData,
			jobData.MimeType,
			"00:00:01.000",
			w.config.DefaultThumbnailWidth,
			w.config.DefaultThumbnailHeight,
			w.config.DefaultJPEGQuality,
		)
	}
	if err != nil {
		return "", fmt.Errorf("generate thumbnail: %w", err)
	}

	return result.ThumbnailBase64, nil
}

func (w *Worker) handleJobFailure(ctx context.Context, jobData *ThumbnailJobData, err error) {
	if ctx.Err() != nil {
		w.logger.WithError(err).Warn("Skipping job retry because worker is stopping")
		return
	}

	if jobData.Attempts <= 1 {
		w.logger.WithError(err).WithFields(logrus.Fields{
			"content_id": jobData.ContentID,
			"type":       jobData.Type,
		}).Error("Thumbnail job failed permanently")
		return
	}

	jobData.Attempts--
	payload, marshalErr := json.Marshal(jobData)
	if marshalErr != nil {
		w.logger.WithError(marshalErr).Error("Failed to marshal retry job")
		return
	}

	if pushErr := w.redis.RPush(ctx, thumbnailQueueName, payload).Err(); pushErr != nil {
		w.logger.WithError(pushErr).Error("Failed to requeue thumbnail job")
		return
	}

	w.logger.WithError(err).WithFields(logrus.Fields{
		"content_id": jobData.ContentID,
		"attempts":   jobData.Attempts,
		"type":       jobData.Type,
	}).Warn("Thumbnail job failed, requeued for retry")
}

func (w *Worker) Stop() error {
	w.logger.Info("Stopping thumbnail worker")
	w.contentStore.Close()
	return w.redis.Close()
}
