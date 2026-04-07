package persistence

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"thumbnail-service/internal/config"
)

type ContentStore struct {
	pool *pgxpool.Pool
}

type contentRecord struct {
	Content string
	Type    string
}

type mediaContentPayload struct {
	Media *mediaPayload `json:"media,omitempty"`
}

type mediaPayload struct {
	ThumbnailBase64 string `json:"thumbnailBase64,omitempty"`
}

type audioContentPayload struct {
	Cover *coverPayload `json:"cover,omitempty"`
}

type coverPayload struct {
	ThumbnailBase64 string `json:"thumbnailBase64,omitempty"`
}

func NewContentStore(ctx context.Context, cfg *config.Config) (*ContentStore, error) {
	pool, err := pgxpool.New(ctx, cfg.PostgresConnectionString())
	if err != nil {
		return nil, fmt.Errorf("create postgres pool: %w", err)
	}

	return &ContentStore{pool: pool}, nil
}

func (s *ContentStore) Ping(ctx context.Context) error {
	return s.pool.Ping(ctx)
}

func (s *ContentStore) Close() {
	s.pool.Close()
}

func (s *ContentStore) UpdateThumbnail(ctx context.Context, contentID string, jobType string, thumbnailBase64 string) error {
	record, err := s.getContent(ctx, contentID)
	if err != nil {
		return err
	}

	updatedContent, err := updateContentPayload(record, jobType, thumbnailBase64)
	if err != nil {
		return err
	}

	_, err = s.pool.Exec(ctx, `
		UPDATE content
		SET content = $2, updated_at = NOW()
		WHERE id = $1
	`, contentID, updatedContent)
	if err != nil {
		return fmt.Errorf("update content thumbnail: %w", err)
	}

	return nil
}

func (s *ContentStore) getContent(ctx context.Context, contentID string) (*contentRecord, error) {
	var record contentRecord
	err := s.pool.QueryRow(ctx, `SELECT type, content FROM content WHERE id = $1`, contentID).Scan(&record.Type, &record.Content)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("content %s not found", contentID)
	}
	if err != nil {
		return nil, fmt.Errorf("load content: %w", err)
	}

	return &record, nil
}

func updateContentPayload(record *contentRecord, jobType string, thumbnailBase64 string) (string, error) {
	switch jobType {
	case "image", "video":
		return updateMediaPayload(record.Content, thumbnailBase64)
	case "audio-cover":
		return updateAudioPayload(record.Content, thumbnailBase64)
	default:
		return "", fmt.Errorf("unsupported thumbnail job type: %s", jobType)
	}
}

func updateMediaPayload(content string, thumbnailBase64 string) (string, error) {
	var payload mediaContentPayload
	if err := json.Unmarshal([]byte(content), &payload); err != nil {
		return "", fmt.Errorf("decode media content: %w", err)
	}
	if payload.Media == nil {
		return "", errors.New("media payload is missing")
	}

	payload.Media.ThumbnailBase64 = thumbnailBase64

	updated, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("encode media content: %w", err)
	}

	return string(updated), nil
}

func updateAudioPayload(content string, thumbnailBase64 string) (string, error) {
	var payload audioContentPayload
	if err := json.Unmarshal([]byte(content), &payload); err != nil {
		return "", fmt.Errorf("decode audio content: %w", err)
	}
	if payload.Cover == nil {
		return "", errors.New("audio cover payload is missing")
	}

	payload.Cover.ThumbnailBase64 = thumbnailBase64

	updated, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("encode audio content: %w", err)
	}

	return string(updated), nil
}
