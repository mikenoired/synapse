# Synapse

_Private media/data manager w/ AI autosorting & context asking_

## Локальный запуск

### 1. Установите зависимости

Понадобятся [Bun 1.3.14+](https://bun.sh/) и Docker с Compose.

```bash
bun install
```

Для загрузки аудио и видео также нужен `ffmpeg`:

```bash
brew install ffmpeg
```

### 2. Настройте окружение

```bash
cp apps/web/.env.example apps/web/.env.local
```

Заполните обязательные секреты в `apps/web/.env.local`:

```env
JWT_SECRET=<случайная строка>
JWT_REFRESH_SECRET=<другая случайная строка>
```

Сгенерировать значения можно командой `openssl rand -hex 32` — отдельно для каждого секрета. Остальные значения уже подходят для локального запуска.

### 3. Запустите инфраструктуру

```bash
docker compose up -d
docker compose ps
```

Будут запущены PostgreSQL, Redis и MinIO. В `docker compose ps` сервисы должны быть в состоянии `Up` или `healthy`.

### 4. Создайте таблицы

```bash
bun --filter @synapse/web db:push
bun --filter @synapse/web db:install-tag-merge
bun --filter @synapse/web search:backfill
```

### 5. Создайте bucket в MinIO

Откройте [http://localhost:9001](http://localhost:9001), войдите с логином и паролем `minioadmin`, затем создайте bucket `synapse`.

### 6. Запустите приложение в режиме разработки

```bash
bun --filter @synapse/web dev
```

Команда запускает два процесса:

- Vite-клиент: [http://localhost:5173](http://localhost:5173)
- Bun + Hono API: [http://localhost:3000](http://localhost:3000)

Для этого режима оставьте в `apps/web/.env.local`:

```env
VITE_API_URL=http://localhost:3000/api
CORS_ORIGIN=http://localhost:5173
```

API-документация Scalar доступна на [http://localhost:3000/api/docs](http://localhost:3000/api/docs), а спецификация OpenAPI — на [http://localhost:3000/api/openapi.json](http://localhost:3000/api/openapi.json).

## Production-сборка и запуск

Соберите клиент для same-origin deployment:

```bash
VITE_API_URL= bun --filter @synapse/web build
```

Для полной проверки перед сборкой:

```bash
bun run check
VITE_API_URL= bun --filter @synapse/web build
```

В production Bun отдаёт и SPA, и Hono API с одного origin на порту `3000`:

```bash
NODE_ENV=production bun --filter @synapse/web start
```

После запуска приложение и API будут доступны на [http://localhost:3000](http://localhost:3000). `VITE_API_URL` встраивается Vite во время **сборки**, поэтому для same-origin запуска он должен быть пустым именно в команде `build`: тогда клиент использует относительный путь `/api`.

## Остановка

```bash
docker compose down
```

Команда сохраняет данные в Docker volumes. Для следующего запуска достаточно выполнить шаги 3 и 6.
