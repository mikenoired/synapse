# Thumbnail Service Tests

Этот каталог содержит тесты для Go микросервиса генерации превью изображений.

## Структура тестов

- `test-utils.js` - Утилиты для тестирования gRPC клиента
- `index.test.js` - Основные интеграционные тесты
- `image-jpeg.test.js` - Тесты для JPEG изображений
- `image-png.test.js` - Тесты для PNG изображений
- `image-gif.test.js` - Тесты для GIF изображений
- `video.test.js` - Тесты для видео файлов
- `performance.test.js` - Тесты производительности
- `assets/` - Тестовые файлы (изображения, видео)

## Запуск тестов

### Все тесты
```bash
bun test
```

### Конкретный тест
```bash
bun test image-jpeg.test.js
```

### Тесты производительности
```bash
bun test performance.test.js
```

## 📊 Сводные таблицы

Тесты теперь выводят красивые сводные таблицы с результатами производительности:

- **JPEG Processing Summary** - результаты обработки JPEG
- **PNG Processing Summary** - результаты обработки PNG  
- **GIF Processing Summary** - результаты обработки GIF
- **Video Processing Summary** - результаты обработки видео
- **Performance Summary** - общие показатели производительности
- **Overall Test Summary** - общая сводка всех тестов

### Тесты с подробным выводом
```bash
bun test --verbose
```

## Требования

1. Go микросервис должен быть запущен на `localhost:50051`
2. Тестовые файлы должны быть в папке `assets/`
3. Bun должен быть установлен

## Добавление новых тестов

1. Создайте новый файл `*.test.js`
2. Импортируйте `ThumbnailTestUtils` из `test-utils.js`
3. Используйте стандартные функции bun test (`test`, `expect`, `describe`)
4. Добавьте тестовые файлы в папку `assets/`

## Пример теста

```javascript
import { test, expect, describe, beforeAll } from 'bun:test'
import { ThumbnailTestUtils } from './test-utils.js'

describe('My Test', () => {
  let testBuffer

  beforeAll(() => {
    testBuffer = ThumbnailTestUtils.loadTestFile('my-test-file.jpg')
  })

  test('should do something', async () => {
    const { response, time } = await ThumbnailTestUtils.generateThumbnail(testBuffer, 'image/jpeg')
    const validation = ThumbnailTestUtils.validateThumbnailResponse(response)
    
    expect(validation.success).toBe(true)
    expect(validation.hasBase64).toBe(true)
    expect(validation.sizeBytes).toBeGreaterThan(0)
    
    console.log(`Time: ${ThumbnailTestUtils.formatTime(time)}`)
  })
})
```
