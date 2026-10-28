# API: События (events)

## POST `/api/events` — создать событие

Требуется авторизация: заголовок `Authorization: Bearer <JWT>`.
`organizer_id` берётся из токена, передавать его не нужно (игнорируется).

Content-Type: `application/json`

### Тело запроса

| Поле | Тип | Обяз. | Описание |
|------|-----|-------|----------|
| `title` | string | да | Название события обычной строкой. Сервер сам переводит его на `en`/`ru` и сохраняет в `title_multilang` (передавать `title_multilang` не нужно) |
| `starts_at` | string (ISO 8601) | да | Дата и время начала, например `2026-11-15T08:00:00+03:00` |
| `description` | string | нет | Описание обычной строкой. Сервер переводит его на `en`/`ru` (с учётом `users.lang` автора) и сохраняет в поле description_multilang как объект `{"ru": "...", "en": "..."}` |
| `route_id` | integer | нет | ID маршрута |
| `meeting_point` | string | нет | Текстовое описание места сбора |
| `meeting_lat` | number | нет | Широта, от -90 до 90. Передавать только вместе с `meeting_lon` |
| `meeting_lon` | number | нет | Долгота, от -180 до 180. Передавать только вместе с `meeting_lat` |
| `country_code` | string(2) | нет | Код страны, например `RU` |
| `pace_id` | integer | нет | ID темпа |
| `difficulty` | string | нет | `easy` \| `moderate` \| `hard` \| `expert` |
| `max_participants` | integer | нет | От 2 до 50 |
| `looking_for_buddies` | boolean | нет | По умолчанию `false` |
| `create_group` | boolean | нет | Тумблер «Create a group». Если `false` — `max_participants` сохраняется как `null` |
| `group_size` | integer | нет | Размер группы (2–50, в UI слайдер 2–12). Сохраняется в `max_participants` |
| `offers_ride` | boolean | нет | «I can offer a ride». Если `true`, создаётся запись в `event_rides` (водитель — организатор) |
| `ride_seats` | integer | при `offers_ride=true` | Свободных мест, 1–8 |
| `map_visibility` | string | нет | Видимость карты маршрута: `all` \| `members` \| `hidden` \| `me` |
| `photo_file_id` | string (uuid) | нет | ID загруженного файла (см. `/api/files/upload`) |
| `status` | string | нет | `planned` (по умолчанию) \| `ongoing` \| `cancelled` \| `completed` |

### Пример запроса

```json
{
  "title": "Поход на Эльбрус",
  "starts_at": "2026-11-15T08:00:00+03:00",
  "description": "Двухдневный поход",
  "route_id": 12,
  "meeting_point": "Парковка у подъёмника",
  "meeting_lat": 43.25,
  "meeting_lon": 42.45,
  "country_code": "RU",
  "difficulty": "hard",
  "max_participants": 10,
  "looking_for_buddies": true,
  "offers_ride": true,
  "ride_seats": 2,
  "map_visibility": "hidden"
}
```

Дата и время из формы (`schedDate` + `schedTime`) фронт склеивает в один `starts_at` с часовым поясом пользователя. Вместо `max_participants` можно слать пару `create_group` + `group_size`.

### Ответы

**201 Created** — возвращает созданную запись:

```json
{
  "id": 1,
  "organizer_id": 5,
  "route_id": 12,
  "title": "Поход на Эльбрус",
  "title_multilang": { "ru": "Поход на Эльбрус", "en": "Elbrus hike" },
  "description_multilang": { "ru": "Двухдневный поход", "en": "Two-day hike" },
  "starts_at": "2026-11-15T05:00:00.000Z",
  "meeting_point": "Парковка у подъёмника",
  "meeting_lat": 43.25,
  "meeting_lon": 42.45,
  "country_code": "RU",
  "pace_id": null,
  "difficulty": "hard",
  "max_participants": 10,
  "looking_for_buddies": true,
  "photo_file_id": null,
  "status": "planned",
  "created_at": "2026-10-28T12:00:00.000Z",
  "updated_at": "2026-10-28T12:00:00.000Z"
}
```

**400 Bad Request** — не переданы `title` (непустая строка) или `starts_at`:

```json
{ "error": "title and starts_at are required" }
```

**401 Unauthorized** — нет или невалидный JWT.

**500** — нарушение ограничений БД (например, `max_participants` вне 2–50, неверный `difficulty`/`status`, несуществующий `route_id`, передан только один из `meeting_lat`/`meeting_lon`). Отдельной валидации этих полей на сервере пока нет, поэтому проверяйте их на фронте.
