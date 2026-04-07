package storage

import (
	"context"
	"fmt"
	"io"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"

	"thumbnail-service/internal/config"
)

type ObjectStore struct {
	bucket string
	client *minio.Client
}

func NewObjectStore(cfg *config.Config) (*ObjectStore, error) {
	client, err := minio.New(cfg.MinIOEndpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.MinIOAccessKey, cfg.MinIOSecretKey, ""),
		Secure: cfg.MinIOUseSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("create minio client: %w", err)
	}

	return &ObjectStore{
		bucket: cfg.MinIOBucketName,
		client: client,
	}, nil
}

func (s *ObjectStore) GetObject(ctx context.Context, objectName string) ([]byte, error) {
	reader, err := s.client.GetObject(ctx, s.bucket, objectName, minio.GetObjectOptions{})
	if err != nil {
		return nil, fmt.Errorf("get object: %w", err)
	}
	defer reader.Close()

	data, err := io.ReadAll(reader)
	if err != nil {
		return nil, fmt.Errorf("read object: %w", err)
	}

	return data, nil
}
