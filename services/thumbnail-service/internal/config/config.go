package config

import (
	"os"
	"strconv"
)

type Config struct {
	GRPCPort string

	PostgresHost     string
	PostgresPort     string
	PostgresUser     string
	PostgresPassword string
	PostgresDatabase string

	RedisHost     string
	RedisPort     string
	RedisPassword string

	MinIOEndpoint   string
	MinIOAccessKey  string
	MinIOSecretKey  string
	MinIOUseSSL     bool
	MinIOBucketName string

	MaxConcurrentJobs int
	MaxImageSize      int64
	MaxVideoSize      int64

	DefaultThumbnailWidth  int
	DefaultThumbnailHeight int
	DefaultJPEGQuality     int
}

func Load() *Config {
	return &Config{
		GRPCPort: getEnv("GRPC_PORT", "50051"),

		PostgresHost:     getEnv("POSTGRES_HOST", "localhost"),
		PostgresPort:     getEnv("POSTGRES_PORT", "5432"),
		PostgresUser:     getEnv("POSTGRES_USER", "postgres"),
		PostgresPassword: getEnv("POSTGRES_PASSWORD", "postgres"),
		PostgresDatabase: getEnv("POSTGRES_DB", "synapse"),

		RedisHost:     getEnv("REDIS_HOST", "localhost"),
		RedisPort:     getEnv("REDIS_PORT", "6379"),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),

		MinIOEndpoint:   getEnv("MINIO_ENDPOINT", "localhost:9000"),
		MinIOAccessKey:  getEnv("MINIO_ACCESS_KEY", "minioadmin"),
		MinIOSecretKey:  getEnv("MINIO_SECRET_KEY", "minioadmin"),
		MinIOUseSSL:     getEnvBool("MINIO_USE_SSL", false),
		MinIOBucketName: getEnv("MINIO_BUCKET_NAME", "synapse"),

		MaxConcurrentJobs: getEnvInt("MAX_CONCURRENT_JOBS", 10),
		MaxImageSize:      getEnvInt64("MAX_IMAGE_SIZE", 50*1024*1024),  // 50MB
		MaxVideoSize:      getEnvInt64("MAX_VIDEO_SIZE", 500*1024*1024), // 500MB

		DefaultThumbnailWidth:  getEnvInt("DEFAULT_THUMBNAIL_WIDTH", 20),
		DefaultThumbnailHeight: getEnvInt("DEFAULT_THUMBNAIL_HEIGHT", 0), // 0 = auto
		DefaultJPEGQuality:     getEnvInt("DEFAULT_JPEG_QUALITY", 40),
	}
}

func (c *Config) PostgresConnectionString() string {
	return "postgres://" + c.PostgresUser + ":" + c.PostgresPassword + "@" + c.PostgresHost + ":" + c.PostgresPort + "/" + c.PostgresDatabase
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if parsed, err := strconv.ParseBool(value); err == nil {
			return parsed
		}
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if parsed, err := strconv.Atoi(value); err == nil {
			return parsed
		}
	}
	return defaultValue
}

func getEnvInt64(key string, defaultValue int64) int64 {
	if value := os.Getenv(key); value != "" {
		if parsed, err := strconv.ParseInt(value, 10, 64); err == nil {
			return parsed
		}
	}
	return defaultValue
}
