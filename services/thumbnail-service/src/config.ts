const integer = (name: string, fallback: number) => {
	const value = Number(process.env[name] ?? fallback);
	return Number.isInteger(value) ? value : fallback;
};

export const config = {
	grpcPort: process.env.GRPC_PORT ?? "50051",
	postgresUrl:
		process.env.DATABASE_URL ??
		`postgres://${process.env.POSTGRES_USER ?? "postgres"}:${process.env.POSTGRES_PASSWORD ?? "postgres"}@${process.env.POSTGRES_HOST ?? "localhost"}:${process.env.POSTGRES_PORT ?? "5432"}/${process.env.POSTGRES_DB ?? "synapse"}`,
	redisUrl:
		process.env.REDIS_URL ??
		`redis://${process.env.REDIS_PASSWORD ? `:${process.env.REDIS_PASSWORD}@` : ""}${process.env.REDIS_HOST ?? "localhost"}:${process.env.REDIS_PORT ?? "6379"}`,
	minio: {
		endPoint: (process.env.MINIO_ENDPOINT ?? "localhost:9000").split(":")[0],
		port: integer(
			"MINIO_PORT",
			Number((process.env.MINIO_ENDPOINT ?? "localhost:9000").split(":")[1]) || 9000
		),
		useSSL: process.env.MINIO_USE_SSL === "true",
		accessKey: process.env.MINIO_ACCESS_KEY ?? "minioadmin",
		secretKey: process.env.MINIO_SECRET_KEY ?? "minioadmin",
	},
	minioBucket: process.env.MINIO_BUCKET_NAME ?? "synapse",
	maxConcurrentJobs: Math.max(1, integer("MAX_CONCURRENT_JOBS", 10)),
	maxImageSize: integer("MAX_IMAGE_SIZE", 50 * 1024 * 1024),
	maxVideoSize: integer("MAX_VIDEO_SIZE", 500 * 1024 * 1024),
	width: integer("DEFAULT_THUMBNAIL_WIDTH", 20),
	height: integer("DEFAULT_THUMBNAIL_HEIGHT", 0),
	quality: integer("DEFAULT_JPEG_QUALITY", 40),
};
