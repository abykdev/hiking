# API: Routes

Базовый путь: `/api/routes`
Все эндпоинты требуют `Authorization: Bearer <access_token>`.

---

## POST /api/routes

Создать маршрут. Принимает файл GPX или GeoJSON.

**Auth:** Bearer token
**Content-Type:** `multipart/form-data`

**FormData:**
| Поле | Тип | Обязательно | Описание |
|---|---|---|---|
| `name` | string | да | Название, 1–200 символов |
| `description` | string | да | Описание, до 5000 символов |
| `file` | File | да | GPX (`.gpx`) или GeoJSON (`.geojson`, `.json`) |
| `lang` | string | нет | Язык названия/описания (например, `ru`). По умолчанию `en` |
| `is_public` | boolean | нет | Публичный маршрут |
| `hike_style` | string \| string[] | нет | ID стилей похода. Повторяющееся поле → массив |

**Ответ 201:**
```json
{
  "id": 6,
  "name": "Sunset trail",
  "name_multilang": { "en": "Sunset trail" },
  "description_multilang": { "en": "..." },
  "user_id": 2,
  "gpx_file_id": 12,
  "geojson_file_id": 13,
  "start_lon": 37.6,
  "start_lat": 55.7,
  "length_m": 12500,
  "elevation_gain_m": 340,
  "elevation_max_m": 520,
  "elevation_min_m": 180,
  "is_public": true,
  "cloned_from_route_id": null,
  "created_at": "2026-10-23T12:00:00Z"
}
Ошибки:

    400 — не multipart / нет name или description / слишком длинные / нет файла

    401 — не авторизован

    413 — файл больше лимита

GET /api/routes

Список маршрутов (с фильтрами).

Auth: Bearer token

Query:
Параметр	Тип	Описание
lang	string	Язык названий
country_code	string	Фильтр по стране (alpha-2)

Ответ 200:
json

{
  "routes": [
    {
      "id": 6,
      "name": "Sunset trail",
      "name_multilang": { "en": "Sunset trail", "ru": "Тропа заката" },
      "country_code": "RU",
      "length_m": 12500,
      "elevation_gain_m": 340,
      "cover_file_id": 42,
      "created_at": "2026-10-23T12:00:00Z"
    }
  ]
}

Ошибки: 401


GET /api/routes/:id

Один маршрут по id.

Auth: Bearer token

Params:
Параметр	Тип	Описание
id	integer	ID маршрута

Ответ 200:
{
  "route": {
    "id": 6,
    "name": "Sunset trail",
    "name_multilang": { "en": "Sunset trail" },
    "description_multilang": { "en": "..." },
    "user_id": 2,
    "gpx_file_id": 12,
    "geojson_file_id": 13,
    "cover_file_id": 42,
    "start_lon": 37.6,
    "start_lat": 55.7,
    "length_m": 12500,
    "elevation_gain_m": 340,
    "elevation_max_m": 520,
    "elevation_min_m": 180,
    "is_public": true,
    "created_at": "2026-10-23T12:00:00Z"
  }
}
Ошибки:

    401 — не авторизован

    404  — маршрут не найден

    

PATCH /api/routes/:id

Обновить метаданные маршрута (без файлов).

Auth: Bearer token
Content-Type: application/json

Params:
Параметр	Тип	Описание
id	integer	ID маршрута

Body (хотя бы одно поле):
Поле	Тип	Описание
name	string	1–100 символов. Обновляет name и name_multilang[lang]
description	string	Обновляет description и description_multilang[lang]
lang	string	Язык для *_multilang. 2–5 символов
is_public	boolean	Публичность
start_lon	number	Долгота старта
start_lat	number	Широта старта
length_m	integer ≥ 0	Длина, метры
elevation_gain_m	integer	Набор высоты
elevation_max_m	integer	Макс. высота
elevation_min_m	integer	Мин. высота
cloned_from_route_id	integer | null	ID маршрута-источника

additionalProperties: false — лишние поля → 400.

Ответ 200:
{ "route": { ...обновлённый маршрут... } }
Ошибки:

    400 — пустой body / лишние поля / невалидные типы

    401 — не авторизован

    404 — маршрут не найден или не принадлежит пользователю

PATCH /api/routes/:id/file

Заменить GPX или GeoJSON файл маршрута.

Auth: Bearer token
Content-Type: multipart/form-data

Params:
Параметр	Тип	Описание
id	integer	ID маршрута

Query:
Параметр	Тип	Обязательно	Описание
type	gpx | geojson	да	Какой файл менять

FormData:
Поле	Тип	Обязательно	Описание
file	File	да	.gpx для type=gpx; .geojson или .json для type=geojson

Ответ 200:
{
  "route": { ...обновлённый маршрут... },
  "file": {
    "id": 13,
    "original_name": "route.geojson",
    "stored_path": "ab/abcd-1234.geojson",
    "mime_type": "application/geo+json",
    "size_bytes": 45231,
    "created_at": "2026-10-23T12:00:00Z"
  }
}
Ошибки:

    400 — не multipart / нет файла / невалидный GPX или GeoJSON / недопустимое расширение

    401 — не авторизован

    404 — маршрут не найден или чужой

    413 — файл больше лимита

PATCH /api/routes/:id/cover

Заменить обложку маршрута.

Auth: Bearer token
Content-Type: multipart/form-data

Params:
Параметр	Тип	Описание
id	integer	ID маршрута

FormData:
Поле	Тип	Обязательно	Описание
cover	File	да	Изображение: .jpg, .jpeg, .png, .webp. MIME: image/jpeg, image/png, image/webp

Ответ 200:
{
  "route": { ...обновлённый маршрут с cover_file_id... },
  "file": { "id": 42, "original_name": "cover.jpg", "mime_type": "image/jpeg", "size_bytes": 87654, ... }
}
Ошибки:

    400 — не multipart / нет поля cover / недопустимое расширение / недопустимый MIME

    401 — не авторизован

    404 — маршрут не найден или чужой

    413 — файл больше лимита

DELETE /api/routes/:id/cover

Удалить обложку маршрута (cover_file_id → null, файл удаляется).

Auth: Bearer token

Params:
Параметр	Тип	Описание
id	integer	ID маршрута

Ответ 204: пустой ответ

Ошибки:

    401 — не авторизован

    404 — маршрут не найден или чужой

Общие правила

    Авторизация: все эндпоинты требуют Authorization: Bearer <access_token>.

    Владение: пользователь может читать/менять только свои маршруты (кроме публичных — см. TODO).

    Ошибки — JSON: { "error": "текст" }.

    Файлы:

        GPX: .gpx

        GeoJSON: .geojson, .json

        Обложки: .jpg, .jpeg, .png, .webp

    multipart: поле для файла — file (кроме обложки — cover). Не ставьте Content-Type руками — браузер добавит boundary.

    lang используется для формирования name_multilang и description_multilang из name/description. Если lang не передан — используется en.
    