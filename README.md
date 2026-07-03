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
cp apps/web/.env.example .env
```

Заполните обязательные секреты в `apps/web/.env.local` и продублируйте инфраструктурные значения в root `.env`, который читает Docker Compose:

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
bun --env-file=.env --filter @synapse/web db:push
bun --env-file=.env --filter @synapse/web db:install-tag-merge
bun --env-file=.env --filter @synapse/web search:backfill
```

### 5. Создайте bucket в MinIO

Приложение создаст bucket `synapse` при первой загрузке файла. Для ручной проверки можно открыть [http://localhost:9001](http://localhost:9001) и войти с логином/паролем из `.env`.

### 6. Запустите приложение

```bash
bun --env-file=.env --filter @synapse/web dev
```

Приложение будет доступно на [http://localhost:3000](http://localhost:3000).

## Остановка

```bash
docker compose down
```

Команда сохраняет данные в Docker volumes. Для следующего запуска достаточно выполнить шаги 3 и 6.
