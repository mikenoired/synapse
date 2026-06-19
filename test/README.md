# Thumbnail Service Integration Tests

Интеграционные тесты gRPC-сервиса генерации миниатюр.

Сначала запустите сервис на `localhost:50051`:

```bash
bun --filter @synapse/thumbnail-service start
```

Затем запустите тесты:

```bash
bun run test:thumbnail:integration
```

Тестовые изображения и видео находятся в `test/assets`.
