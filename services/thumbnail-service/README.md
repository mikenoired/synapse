# Thumbnail Service

Bun/TypeScript gRPC-сервис и Redis-воркер для миниатюр изображений, видео и аудио-обложек.

```bash
bun --filter @synapse/thumbnail-service start
bun --filter @synapse/thumbnail-service worker
bun --filter @synapse/thumbnail-service test
```

Для видео требуется `ffmpeg`. Изображения уменьшаются и кодируются в JPEG без размытия: blur применяется CSS-классами в UI. Старое protobuf-поле `blur` сохранено для совместимости и игнорируется.
