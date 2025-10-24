package server

import (
	"context"
	"fmt"
	"net"
	"time"

	"github.com/sirupsen/logrus"
	"google.golang.org/grpc"

	"thumbnail-service/internal/config"
	"thumbnail-service/internal/thumbnail"
	pb "thumbnail-service/proto"
)

type ThumbnailServer struct {
	pb.UnimplementedThumbnailServiceServer
	processor *thumbnail.Processor
	config    *config.Config
	logger    *logrus.Logger
}

func NewThumbnailServer(cfg *config.Config, logger *logrus.Logger) *ThumbnailServer {
	processor := thumbnail.NewProcessor(logger)

	return &ThumbnailServer{
		processor: processor,
		config:    cfg,
		logger:    logger,
	}
}

func (s *ThumbnailServer) GenerateImageThumbnail(ctx context.Context, req *pb.ImageThumbnailRequest) (*pb.ThumbnailResponse, error) {
	s.logger.WithFields(logrus.Fields{
		"mime_type": req.MimeType,
		"width":     req.Width,
		"height":    req.Height,
		"quality":   req.Quality,
		"blur":      req.Blur,
	}).Info("Processing image thumbnail request")

	if len(req.ImageData) == 0 {
		return &pb.ThumbnailResponse{
			Success:      false,
			ErrorMessage: "image data is required",
		}, nil
	}

	if int64(len(req.ImageData)) > s.config.MaxImageSize {
		return &pb.ThumbnailResponse{
			Success:      false,
			ErrorMessage: fmt.Sprintf("image size exceeds maximum allowed size of %d bytes", s.config.MaxImageSize),
		}, nil
	}

	width := int(req.Width)
	if width <= 0 {
		width = s.config.DefaultThumbnailWidth
	}

	height := int(req.Height)
	if height <= 0 {
		height = s.config.DefaultThumbnailHeight
	}

	quality := int(req.Quality)
	if quality <= 0 || quality > 100 {
		quality = s.config.DefaultJPEGQuality
	}

	result, err := s.processor.ProcessImage(ctx, req.ImageData, req.MimeType, width, height, quality)
	if err != nil {
		s.logger.WithError(err).Error("Failed to process image")
		return &pb.ThumbnailResponse{
			Success:      false,
			ErrorMessage: err.Error(),
		}, nil
	}

	return &pb.ThumbnailResponse{
		Success:         true,
		ThumbnailBase64: result.ThumbnailBase64,
		MimeType:        result.MimeType,
		Width:           result.Width,
		Height:          result.Height,
		SizeBytes:       result.SizeBytes,
	}, nil
}

func (s *ThumbnailServer) GenerateVideoThumbnail(ctx context.Context, req *pb.VideoThumbnailRequest) (*pb.ThumbnailResponse, error) {
	if len(req.VideoData) == 0 {
		return &pb.ThumbnailResponse{
			Success:      false,
			ErrorMessage: "video data is required",
		}, nil
	}

	if int64(len(req.VideoData)) > s.config.MaxVideoSize {
		return &pb.ThumbnailResponse{
			Success:      false,
			ErrorMessage: fmt.Sprintf("video size exceeds maximum allowed size of %d bytes", s.config.MaxVideoSize),
		}, nil
	}

	width := int(req.Width)
	if width <= 0 {
		width = s.config.DefaultThumbnailWidth
	}

	height := int(req.Height)
	if height <= 0 {
		height = s.config.DefaultThumbnailHeight
	}

	quality := int(req.Quality)
	if quality <= 0 || quality > 100 {
		quality = s.config.DefaultJPEGQuality
	}

	timestamp := req.Timestamp
	if timestamp == "" {
		timestamp = "00:00:01.000"
	}

	result, err := s.processor.ProcessVideo(ctx, req.VideoData, req.MimeType, timestamp, width, height, quality)
	if err != nil {
		s.logger.WithError(err).Error("Failed to process video")
		return &pb.ThumbnailResponse{
			Success:      false,
			ErrorMessage: err.Error(),
		}, nil
	}

	return &pb.ThumbnailResponse{
		Success:         true,
		ThumbnailBase64: result.ThumbnailBase64,
		MimeType:        result.MimeType,
		Width:           result.Width,
		Height:          result.Height,
		SizeBytes:       result.SizeBytes,
	}, nil
}

func (s *ThumbnailServer) GetImageDimensions(ctx context.Context, req *pb.ImageDimensionsRequest) (*pb.ImageDimensionsResponse, error) {
	if len(req.ImageData) == 0 {
		return &pb.ImageDimensionsResponse{
			Success:      false,
			ErrorMessage: "image data is required",
		}, nil
	}

	dimensions, err := s.processor.GetImageDimensions(req.ImageData, req.MimeType)
	if err != nil {
		s.logger.WithError(err).Error("Failed to get image dimensions")
		return &pb.ImageDimensionsResponse{
			Success:      false,
			ErrorMessage: err.Error(),
		}, nil
	}

	return &pb.ImageDimensionsResponse{
		Success:   true,
		Width:     int32(dimensions.Width),
		Height:    int32(dimensions.Height),
		SizeBytes: dimensions.Size,
	}, nil
}

func StartGRPCServer(cfg *config.Config, logger *logrus.Logger) error {
	grpcServer := grpc.NewServer(
		grpc.UnaryInterceptor(loggingInterceptor(logger)),
		grpc.MaxRecvMsgSize(100*1024*1024), // 100MB
		grpc.MaxSendMsgSize(100*1024*1024), // 100MB
	)

	thumbnailServer := NewThumbnailServer(cfg, logger)
	pb.RegisterThumbnailServiceServer(grpcServer, thumbnailServer)

	addr := ":" + cfg.GRPCPort
	logger.WithField("address", addr).Info("Starting gRPC server")

	return grpcServer.Serve(listen(addr))
}

func loggingInterceptor(logger *logrus.Logger) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req any, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (any, error) {
		start := time.Now()

		logger.WithFields(logrus.Fields{
			"method": info.FullMethod,
		}).Info("gRPC request started")

		resp, err := handler(ctx, req)

		duration := time.Since(start)
		fields := logrus.Fields{
			"method":   info.FullMethod,
			"duration": duration,
		}

		if err != nil {
			fields["error"] = err.Error()
			logger.WithFields(fields).Error("gRPC request failed")
		} else {
			logger.WithFields(fields).Info("gRPC request completed")
		}

		return resp, err
	}
}

func listen(addr string) net.Listener {
	lis, err := net.Listen("tcp", addr)
	if err != nil {
		panic(fmt.Sprintf("failed to listen on %s: %v", addr, err))
	}
	return lis
}
