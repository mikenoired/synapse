package thumbnail

import (
	"bytes"
	"context"
	"encoding/base64"
	"fmt"
	"image"
	_ "image/gif"
	"image/jpeg"
	_ "image/png"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/disintegration/imaging"
	"github.com/sirupsen/logrus"
)

type Processor struct {
	logger *logrus.Logger
}

func NewProcessor(logger *logrus.Logger) *Processor {
	return &Processor{
		logger: logger,
	}
}

type ImageDimensions struct {
	Width  int
	Height int
	Size   int64
}

type ProcessImageResult struct {
	ThumbnailBase64 string
	Width           int32
	Height          int32
	SizeBytes       int64
	MimeType        string
}

func (p *Processor) ProcessImage(ctx context.Context, data []byte, mimeType string, width, height int, quality int) (*ProcessImageResult, error) {
	format := p.detectImageFormat(mimeType, data)

	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("failed to decode %s image: %w", format, err)
	}

	bounds := img.Bounds()
	originalWidth := bounds.Dx()
	originalHeight := bounds.Dy()

	thumbWidth, thumbHeight := p.calculateThumbnailSize(originalWidth, originalHeight, width, height)

	thumbnail := imaging.Resize(img, thumbWidth, thumbHeight, imaging.Linear)

	thumbnail = imaging.Blur(thumbnail, 2.0)

	var buf bytes.Buffer
	estimatedSize := thumbWidth * thumbHeight * 3 / 10
	buf.Grow(estimatedSize)
	err = jpeg.Encode(&buf, thumbnail, &jpeg.Options{Quality: quality})
	if err != nil {
		return nil, fmt.Errorf("failed to encode thumbnail: %w", err)
	}

	thumbnailBase64 := base64.StdEncoding.EncodeToString(buf.Bytes())

	return &ProcessImageResult{
		ThumbnailBase64: thumbnailBase64,
		Width:           int32(thumbWidth),
		Height:          int32(thumbHeight),
		SizeBytes:       int64(buf.Len()),
		MimeType:        "image/jpeg",
	}, nil
}

func (p *Processor) ProcessVideo(ctx context.Context, data []byte, mimeType, timestamp string, width, height int, quality int) (*ProcessImageResult, error) {
	tempDir := "/tmp"
	videoFile := filepath.Join(tempDir, fmt.Sprintf("video_%d.mp4", time.Now().UnixNano()))
	frameFile := filepath.Join(tempDir, fmt.Sprintf("frame_%d.jpg", time.Now().UnixNano()))

	if err := writeFile(videoFile, data); err != nil {
		return nil, fmt.Errorf("failed to write video file: %w", err)
	}
	defer removeFile(videoFile)

	if err := p.extractFrame(videoFile, frameFile, timestamp); err != nil {
		return nil, fmt.Errorf("failed to extract frame: %w", err)
	}
	defer removeFile(frameFile)

	frameData, err := readFile(frameFile)
	if err != nil {
		return nil, fmt.Errorf("failed to read frame file: %w", err)
	}

	return p.ProcessImage(ctx, frameData, "image/jpeg", width, height, quality)
}

func (p *Processor) GetImageDimensions(data []byte, mimeType string) (*ImageDimensions, error) {
	format := p.detectImageFormat(mimeType, data)

	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("failed to decode %s image: %w", format, err)
	}

	bounds := img.Bounds()
	return &ImageDimensions{
		Width:  bounds.Dx(),
		Height: bounds.Dy(),
		Size:   int64(len(data)),
	}, nil
}

func (p *Processor) calculateThumbnailSize(originalWidth, originalHeight, targetWidth, targetHeight int) (int, int) {
	if targetWidth <= 0 && targetHeight <= 0 {
		targetWidth = 20
	}

	if targetWidth <= 0 {
		ratio := float64(originalWidth) / float64(originalHeight)
		targetWidth = int(float64(targetHeight) * ratio)
	} else if targetHeight <= 0 {
		ratio := float64(originalHeight) / float64(originalWidth)
		targetHeight = int(float64(targetWidth) * ratio)
	}

	if originalWidth <= targetWidth && originalHeight <= targetHeight {
		return originalWidth, originalHeight
	}

	widthRatio := float64(targetWidth) / float64(originalWidth)
	heightRatio := float64(targetHeight) / float64(originalHeight)

	ratio := widthRatio
	if heightRatio < widthRatio {
		ratio = heightRatio
	}

	newWidth := int(float64(originalWidth) * ratio)
	newHeight := int(float64(originalHeight) * ratio)

	return newWidth, newHeight
}

func (p *Processor) extractFrame(videoFile, frameFile, timestamp string) error {
	cmd := exec.Command("ffmpeg",
		"-i", videoFile,
		"-ss", timestamp,
		"-vframes", "1",
		"-y",
		frameFile,
	)

	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("ffmpeg failed: %s, output: %s", err, string(output))
	}

	return nil
}

func writeFile(filename string, data []byte) error {
	return os.WriteFile(filename, data, 0644)
}

func readFile(filename string) ([]byte, error) {
	return os.ReadFile(filename)
}

func removeFile(filename string) {
	os.Remove(filename)
}

func (p *Processor) detectImageFormat(mimeType string, data []byte) string {
	switch strings.ToLower(mimeType) {
	case "image/jpeg", "image/jpg":
		return "JPEG"
	case "image/png":
		return "PNG"
	case "image/gif":
		return "GIF"
	case "image/webp":
		return "WebP"
	case "image/bmp":
		return "BMP"
	case "image/tiff", "image/tif":
		return "TIFF"
	}

	if len(data) >= 4 {
		if data[0] == 0xFF && data[1] == 0xD8 && data[2] == 0xFF {
			return "JPEG"
		}
		if data[0] == 0x89 && data[1] == 0x50 && data[2] == 0x4E && data[3] == 0x47 {
			return "PNG"
		}
		if data[0] == 0x47 && data[1] == 0x49 && data[2] == 0x46 && data[3] == 0x38 {
			return "GIF"
		}
		if len(data) >= 12 && data[0] == 0x52 && data[1] == 0x49 && data[2] == 0x46 && data[3] == 0x46 &&
			data[8] == 0x57 && data[9] == 0x45 && data[10] == 0x42 && data[11] == 0x50 {
			return "WebP"
		}
		if data[0] == 0x42 && data[1] == 0x4D {
			return "BMP"
		}
		if (data[0] == 0x49 && data[1] == 0x49 && data[2] == 0x2A && data[3] == 0x00) ||
			(data[0] == 0x4D && data[1] == 0x4D && data[2] == 0x00 && data[3] == 0x2A) {
			return "TIFF"
		}
	}

	return "Unknown"
}
