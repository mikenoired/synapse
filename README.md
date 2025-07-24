# OPI - Интерактивный мозг

Современное приложение для хранения заметок, файлов и идей. Организуйте свои мысли с помощью тегов и быстрого поиска.

## Стек технологий

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI**: shadcn/ui, Tailwind CSS, Motion (Framer Motion)
- **Backend**: tRPC, Zod для валидации
- **База данных**: Supabase (PostgreSQL)
- **Файловое хранилище**: MinIO
- **Пакетный менеджер**: Bun
- **Линтер**: ESLint с конфигом @antfu

## Быстрый старт

### 1. Клонирование и установка зависимостей

```bash
git clone <repo-url>
cd opi
bun install
```

### 2. Настройка Supabase

#### Создание проекта

1. Перейдите на [supabase.com](https://supabase.com)
2. Создайте новый аккаунт или войдите в существующий
3. Нажмите "New Project"
4. Выберите организацию и введите детали проекта:
   - **Name**: opi-database
   - **Database Password**: создайте надежный пароль
   - **Region**: выберите ближайший регион
5. Дождитесь создания проекта (обычно 1-2 минуты)

#### Настройка схемы базы данных

После создания проекта:

1. Перейдите в **SQL Editor** в боковом меню
2. Создайте таблицы, выполнив этот SQL:

```sql
-- Создание таблицы для контента
CREATE TABLE content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL CHECK (type IN ('note', 'image', 'link')),
  title TEXT,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  reminder_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Создание индексов для оптимизации поиска
CREATE INDEX idx_content_user_id ON content(user_id);
CREATE INDEX idx_content_type ON content(type);
CREATE INDEX idx_content_tags ON content USING GIN(tags);
CREATE INDEX idx_content_created_at ON content(created_at);

-- Включение Row Level Security
ALTER TABLE content ENABLE ROW LEVEL SECURITY;

-- Политики безопасности
CREATE POLICY "Users can view their own content" ON content
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own content" ON content
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own content" ON content
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own content" ON content
  FOR DELETE USING (auth.uid() = user_id);

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_content_updated_at
  BEFORE UPDATE ON content
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

#### Получение ключей API

1. Перейдите в **Settings** → **API**
2. Скопируйте следующие значения:
   - **Project URL** (например: `https://abcdefghijklmnop.supabase.co`)
   - **Anon public key** (начинается с `eyJhbGciOiJIUzI1NiIs...`)
   - **Service role key** (начинается с `eyJhbGciOiJIUzI1NiIs...`)

### 3. Настройка MinIO (для файлового хранилища)

#### Запуск через Docker Compose (рекомендуется)

```bash
# Запустить только MinIO
bun run minio:setup

# Или запустить все сервисы
bun run docker:up

# Просмотр логов
bun run docker:logs

# Остановка сервисов
bun run docker:down
```

#### Создание bucket

1. Откройте http://localhost:9001 в браузере
2. Войдите с данными из .env файла (по умолчанию: `minioadmin` / `minioadmin`)
3. Нажмите "Create Bucket"
4. Введите имя: `opi-files`
5. Создайте bucket

### 4. Настройка переменных окружения

Создайте файл `.env.local` в корне проекта:

```bash
cp env.example .env.local
```

Отредактируйте `.env.local` с вашими данными:

```env
# Supabase (замените на ваши значения)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# MinIO
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=opi-files

# Docker MinIO Configuration
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001
```

### 5. Запуск приложения

```bash
# Запуск MinIO
bun run minio:setup

# Запуск приложения
bun dev
```

Приложение будет доступно по адресу: http://localhost:3000
MinIO консоль: http://localhost:9001

## Docker команды

- `bun run docker:up` - Запустить все сервисы
- `bun run docker:down` - Остановить все сервисы  
- `bun run docker:logs` - Просмотр логов
- `bun run minio:setup` - Запустить только MinIO

## Функциональность

### ✅ Реализовано

- 🎨 Адаптивный дизайн с темной/светлой темой
- 🔐 Аутентификация (регистрация/вход)
- 📝 Создание заметок с тегами
- 🔗 Добавление ссылок
- 🖼️ Загрузка изображений (UI готов)
- 🔍 Поиск по содержимому и тегам
- 🏷️ Фильтрация по тегам
- ⚡ Горячие клавиши (⌘N - новый контент, ⌘K - поиск)
- 💀 Скелетоны для загружающихся элементов
- 🎭 Плавные анимации с Motion
- 🐳 Docker Compose для MinIO

### 🚧 В планах

- 🔌 Полная интеграция с tRPC/Supabase
- 📁 Файловый manager с MinIO
- 🔔 Напоминания по времени
- 📱 PWA поддержка
- 🎨 Доски для рисования
- 🔗 OAuth провайдеры (Google, GitHub, Apple)

## Горячие клавиши

- `⌘/Ctrl + N` - Создать новый контент
- `⌘/Ctrl + K` - Фокус на поиск
- `Escape` - Закрыть диалоги

## Лицензия

MIT