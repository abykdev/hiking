# Routes API

Все эндпойнты используют префикс `/api/routes` и требуют заголовок
`Authorization: Bearer <JWT>`. Без валидного токена возвращается
`401 Unauthorized`.

Ошибки имеют вид `{ "error": "..." }`.

## GET `/api/routes` — список маршрутов

### Query-параметры

| Параметр | Тип | Описание |
|---|---|---|
| `lang` | string | Язык `name`/`description` в ответе. По умолчанию `en` |
| `q` | string (до 100 символов) | Быстрый поиск по названию, описанию, региону, названиям старта/финиша и названию страны на всех языках. Без учёта регистра и диакритики. Несколько слов через пробел — все должны встречаться |
| `user_id` | integer | Маршруты автора |
| `country_code` | string | Код страны, например `RU` |
| `min_length_m`, `max_length_m` | integer | Диапазон длины, м |
| `min_elevation_m`, `max_elevation_m` | integer | Диапазон набора высоты, м |
| `created_after`, `created_before` | string (дата, ISO 8601) | Диапазон даты создания |
| `hike_style_id` | integer или список через запятую | Стиль похода (`/api/refs/hikeStyle`), например `1,3` — любой из перечисленных |
| `limit` | integer | По умолчанию 50, максимум 200 |
| `offset` | integer | По умолчанию 0 |

Сортировка: сначала новые (`created_at DESC`). Некорректные значения числовых
и датовых фильтров игнорируются.

### Пример

```http
GET /api/routes?q=эльбрус&lang=ru&country_code=RU&limit=20
```

### Ответ `200 OK`

```json
{
  "routes": [
    {
      "id": 12,
      "name": "Эльбрус",
      "description": "Восхождение",
      "user_id": 5,
      "gpx_file_id": "a8f4c136-9404-41d9-84d4-520fed9fc3c8",
      "geojson_file_id": "0c1f0f4e-52d3-4b57-9c52-2f3a1f6e0b11",
      "gpx_url": "https://files.abyk.ru/uploads/....gpx",
      "geojson_url": "https://files.abyk.ru/uploads/....geojson",
      "start_lon": 42.45,
      "start_lat": 43.25,
      "length_m": 7472,
      "elevation_gain_m": 620,
      "elevation_max_m": 1800,
      "elevation_min_m": 1180,
      "created_at": "2026-10-28T12:00:00.000Z"
    }
  ]
}
```

`gpx_url` и `geojson_url` присутствуют, только если у маршрута есть
соответствующий файл. Пагинации с `total` нет: если вернулось меньше `limit`
записей, это последняя страница.

## GET `/api/routes/:id` — один маршрут

### Ответ `200 OK`

```json
{
  "route": {
    "id": 12,
    "name": "Elbrus",
    "description": "Ascent",
    "name_multilang": { "en": "Elbrus", "ru": "Эльбрус" },
    "description_multilang": { "en": "Ascent", "ru": "Восхождение" },
    "user_id": 5,
    "gpx_file_id": "a8f4c136-9404-41d9-84d4-520fed9fc3c8",
    "geojson_file_id": "0c1f0f4e-52d3-4b57-9c52-2f3a1f6e0b11",
    "gpx_url": "https://files.abyk.ru/uploads/....gpx",
    "geojson_url": "https://files.abyk.ru/uploads/....geojson",
    "start_lon": 42.45,
    "start_lat": 43.25,
    "length_m": 7472,
    "elevation_gain_m": 620,
    "elevation_max_m": 1800,
    "elevation_min_m": 1180,
    "created_at": "2026-10-28T12:00:00.000Z"
  }
}
```

Параметр `lang` (query, необязательный, по умолчанию `en`) задаёт язык `name` и
`description`; если перевода на этот язык нет, берётся `en`. Полные переводы —
в `name_multilang` / `description_multilang`.

```http
GET /api/routes/12?lang=ru
```

Ошибки: `404` `{ "error": "Route not found" }`.

## POST `/api/routes` — создать маршрут

`Content-Type: multipart/form-data`. Автор берётся из токена.

| Поле | Тип | Обяз. | Описание |
|---|---|---|---|
| `file` | file | да | Трек: `.gpx` или GeoJSON (Feature/FeatureCollection). До 20 МиБ. Из GPX дополнительно строится GeoJSON |
| `name` | string (до 200) | да | Название |
| `description` | string (до 5000) | да | Описание |
| `lang` | string | нет | Язык введённых `name`/`description`, по умолчанию `en` |
| `is_public` | boolean | нет | Публичный ли маршрут |
| `hike_style` | integer (поле можно повторять) | нет | Стили похода (`/api/refs/hikeStyle`). Несуществующий id → `400 unknown hike_style id` |

Сервер сам считает по треку длину, набор/мин/макс высоту, стартовую точку,
расчётное время и сложность (`easy` / `moderate` / `hard` / `expert`),
определяет страну и переводит название, описание и регион на `en`/`ru`.

### Ответ `201 Created`

Созданная запись маршрута (все колонки `routes`), например:

```json
{
  "id": 12,
  "name": "Elbrus",
  "user_id": 5,
  "is_public": true,
  "name_multilang": { "en": "Elbrus", "ru": "Эльбрус" },
  "length_m": 7472,
  "difficulty": "moderate",
  "country_code": "RU",
  "created_at": "2026-10-28T12:00:00.000Z"
}
```

### Ошибки

- `400` — не multipart; нет `name`/`description`; слишком длинные поля; нет `file`.
- `413` — файл больше 20 МиБ: `{ "error": "File too large" }`.

## PATCH `/api/routes/:id` — изменить маршрут

Только автор маршрута. `Content-Type: application/json`. Нужно передать хотя бы
одно поле, неизвестные поля дают `400`.

| Поле | Тип | Описание |
|---|---|---|
| `name` | string (1–100) | Название. Вместе с `lang` обновляет и перевод для этого языка |
| `description` | string | Описание. Вместе с `lang` обновляет перевод |
| `lang` | string (2–5 символов) | Язык, к которому относятся `name`/`description` |
| `is_public` | boolean | Публичность |
| `start_lon`, `start_lat` | number | Стартовая точка |
| `length_m` | integer ≥ 0 | Длина, м |
| `elevation_gain_m`, `elevation_max_m`, `elevation_min_m` | integer | Высоты, м |
| `cloned_from_route_id` | integer или `null` | Исходный маршрут при клонировании |
| `hike_style` | array of integer | Полный набор стилей похода (`/api/refs/hikeStyle`): заменяет текущий. `[]` — очистить. Не передан — стили не меняются |

### Пример

```http
PATCH /api/routes/12
Content-Type: application/json

{ "name": "Эльбрус", "lang": "ru", "is_public": false }
```

### Ответ `200 OK`

`{ "route": { ...обновлённая запись маршрута... } }`

### Ошибки

- `400` — пустое тело, неизвестное поле или значение неверного типа.
- `404` — маршрут не найден или принадлежит другому пользователю: `{ "error": "Route not found" }`.

## PATCH `/api/routes/:id/file?type=gpx|geojson` — заменить файл трека

Только автор маршрута. `Content-Type: multipart/form-data`, файл в поле `file`.

| Query | Описание |
|---|---|
| `type` | Обязателен: `gpx` или `geojson` — какой файл заменяется |

Файл проверяется до сохранения: расширение (`.gpx` для `gpx`; `.geojson` или
`.json` для `geojson`), для GPX разбирается трек, для GeoJSON должен быть
`Feature` или `FeatureCollection`. Старый файл удаляется после загрузки нового.

После замены сервер пересчитывает по новому треку стартовую точку, длину,
набор/мин/макс высоту, расчётное время и сложность. При `type=gpx` также
пересоздаётся GeoJSON-файл маршрута (`geojson_file_id` меняется). Страна не
пересчитывается.

### Ответ `200 OK`

```json
{
  "route": { "id": 12, "gpx_file_id": "…" },
  "file": {
    "id": "…",
    "original_name": "track.gpx",
    "stored_path": "uploads/….gpx",
    "mime_type": "application/gpx+xml",
    "size_bytes": 2048,
    "created_at": "2026-10-28T12:00:00.000Z"
  }
}
```

### Ошибки

- `400` — не multipart, нет поля `file`, `type` не `gpx`/`geojson`, недопустимое расширение или файл невалиден (`invalid gpx file: ...`).
- `404` — маршрут не найден или не ваш.

## PATCH `/api/routes/:id/cover` — загрузить/заменить обложку

Только автор маршрута. `Content-Type: multipart/form-data`, файл в поле
`cover`. Допустимы `.jpg`, `.jpeg`, `.png`, `.webp` и MIME `image/jpeg`,
`image/png`, `image/webp`. Старая обложка удаляется.

### Ответ `200 OK`

`{ "route": { ... }, "file": { ...метаданные файла... } }`

### Ошибки

- `400` — не multipart, нет поля `cover`, недопустимое расширение (`cover must be one of: ...`) или не изображение (`cover must be an image`).
- `404` — маршрут не найден или не ваш.

## DELETE `/api/routes/:id/cover` — удалить обложку

Только автор маршрута. Операция идемпотентна: если обложки нет, всё равно `204`.

### Ответ `204 No Content`

Без тела.

### Ошибки

- `404` — маршрут не найден или не ваш: `{ "error": "Route not found" }`.
