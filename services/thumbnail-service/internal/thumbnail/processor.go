package thumbnail

import (
	"bytes"
	"context"
	"fmt"
	"image"
	"image/color"
	"image/jpeg"
	"os"
	"os/exec"
	"path/filepath"
	"time"

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

func (p *Processor) ProcessImage(ctx context.Context, data []byte, mimeType string, width, height int, quality int, blur bool) (*ProcessImageResult, error) {
	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("failed to decode image: %w", err)
	}

	bounds := img.Bounds()
	originalWidth := bounds.Dx()
	originalHeight := bounds.Dy()

	thumbWidth, thumbHeight := p.calculateThumbnailSize(originalWidth, originalHeight, width, height)

	thumbnail, err := p.resizeImage(img, thumbWidth, thumbHeight)
	if err != nil {
		return nil, fmt.Errorf("failed to resize image: %w", err)
	}

	if blur {
		thumbnail, err = p.applyBlur(thumbnail)
		if err != nil {
			p.logger.Warnf("Failed to apply blur: %v", err)
		}
	}

	var buf bytes.Buffer
	err = jpeg.Encode(&buf, thumbnail, &jpeg.Options{Quality: quality})
	if err != nil {
		return nil, fmt.Errorf("failed to encode thumbnail: %w", err)
	}

	thumbnailBase64 := fmt.Sprintf("data:image/jpeg;base64,%s", encodeBase64(buf.Bytes()))

	return &ProcessImageResult{
		ThumbnailBase64: thumbnailBase64,
		Width:           int32(thumbWidth),
		Height:          int32(thumbHeight),
		SizeBytes:       int64(buf.Len()),
		MimeType:        "image/jpeg",
	}, nil
}

func (p *Processor) ProcessVideo(ctx context.Context, data []byte, mimeType, timestamp string, width, height int, quality int, blur bool) (*ProcessImageResult, error) {
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

	return p.ProcessImage(ctx, frameData, "image/jpeg", width, height, quality, blur)
}

func (p *Processor) GetImageDimensions(data []byte, mimeType string) (*ImageDimensions, error) {
	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("failed to decode image: %w", err)
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

func (p *Processor) resizeImage(img image.Image, width, height int) (image.Image, error) {
	bounds := img.Bounds()
	if bounds.Dx() == width && bounds.Dy() == height {
		return img, nil
	}

	resized := image.NewRGBA(image.Rect(0, 0, width, height))

	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			srcX := x * bounds.Dx() / width
			srcY := y * bounds.Dy() / height
			resized.Set(x, y, img.At(srcX, srcY))
		}
	}

	return resized, nil
}

func (p *Processor) applyBlur(img image.Image) (image.Image, error) {
	bounds := img.Bounds()
	blurred := image.NewRGBA(bounds)

	radius := 1
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			var r, g, b, a uint32
			count := 0

			for dy := -radius; dy <= radius; dy++ {
				for dx := -radius; dx <= radius; dx++ {
					nx, ny := x+dx, y+dy
					if nx >= bounds.Min.X && nx < bounds.Max.X && ny >= bounds.Min.Y && ny < bounds.Max.Y {
						pr, pg, pb, pa := img.At(nx, ny).RGBA()
						r += pr
						g += pg
						b += pb
						a += pa
						count++
					}
				}
			}

			if count > 0 {
				blurred.Set(x, y, color.RGBA{
					R: uint8((r / uint32(count)) >> 8),
					G: uint8((g / uint32(count)) >> 8),
					B: uint8((b / uint32(count)) >> 8),
					A: uint8((a / uint32(count)) >> 8),
				})
			}
		}
	}

	return blurred, nil
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

func encodeBase64(data []byte) string {
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

	result := make([]byte, 0, (len(data)*4+2)/3)

	for i := 0; i < len(data); i += 3 {
		var b1, b2, b3 byte
		b1 = data[i]
		if i+1 < len(data) {
			b2 = data[i+1]
		}
		if i+2 < len(data) {
			b3 = data[i+2]
		}

		result = append(result, charset[b1>>2])
		result = append(result, charset[((b1&0x03)<<4)|(b2>>4)])

		if i+1 < len(data) {
			result = append(result, charset[((b2&0x0f)<<2)|(b3>>6)])
		} else {
			result = append(result, '=')
		}

		if i+2 < len(data) {
			result = append(result, charset[b3&0x3f])
		} else {
			result = append(result, '=')
		}
	}

	return string(result)
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
