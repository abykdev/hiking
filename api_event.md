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

---

Все эндпойнты ниже требуют `Authorization: Bearer <JWT>`.

## GET `/api/events` — список событий

Сортировка: `starts_at` по возрастанию.

| Query | Описание |
|-------|----------|
| `mine=1` | Только события, где я участвую (статусы `confirmed`, `requested`, `invited`, `waitlisted`) |
| `upcoming=1` | Только будущие (`starts_at >= now`) |
| `looking_for_buddies=1` | Только с флагом поиска попутчиков |
| `country_code` | Код страны, например `RU` |
| `route_id` | ID маршрута |
| `organizer_id` | ID организатора |
| `from`, `to` | Границы `starts_at` (ISO 8601) |
| `limit` | 1–100, по умолчанию 20 |
| `offset` | По умолчанию 0 |

**200 OK**

```json
{
  "items": [
    {
      "id": 1, "organizer_id": 5, "route_id": 12, "title": "...", "title_multilang": {},
      "starts_at": "...", "status": "planned",
      "stats": { "confirmed_count": 1, "requests_count": 0, "waitlist_count": 0, "spots_left": 9, "ride_seats_left": 2 }
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

Элемент `items` содержит все колонки события плюс `stats`.

## GET `/api/events/:id` — событие

**200 OK** — все колонки события и дополнительно:

- `route` — кратко: `id`, `name`, `name_multilang`, `length_m`, `elevation_gain_m`, `difficulty`, `start_lat`, `start_lon`, `country_code` (или `null`, если маршрута нет);
- `organizer` — `id`, `username`, `city`, `country_code`, `rating_avg`, `rating_count`;
- `participants_preview` — до 5 подтверждённых участников `[{ id, username, role }]`, организатор первым;
- `stats` — из `event_stats`: `confirmed_count`, `requests_count`, `waitlist_count`, `spots_left`, `ride_seats_left`;
- `my_status` — мой статус участия (`requested`, `invited`, `confirmed`, `waitlisted`, `declined`, `left`) или `null`.

Ошибки: **400** (некорректный id), **404** `{ "error": "Event not found" }`.

## PATCH `/api/events/:id` — изменить событие

Менять может только организатор. Тело — любое подмножество полей из `POST` (кроме `organizer_id`, он игнорируется). `title`/`description` пересчитывают `*_multilang`, `create_group`/`group_size` — `max_participants`. Поля `offers_ride`/`ride_seats` в PATCH не обрабатываются.

**200 OK** — возвращается обновлённое событие в том же формате, что `GET /api/events/:id`.

Ошибки: **400** (некорректный id, пустой `title`, неверный `map_visibility`), **403** `{ "error": "Only the organizer can update the event" }`, **404**.

---

## Участие, приглашения, отмена

Ошибки везде имеют вид `{ "error": "..." }`. Общие коды: **400** некорректный id/тело, **403** нет прав, **404** нет события/участницы, **409** действие недопустимо в текущем состоянии.

Статусы участия: `requested`, `invited`, `confirmed`, `waitlisted`, `declined`, `left`.

### DELETE `/api/events/:id` — отменить событие

Только организатор. Ставит `status = cancelled` и отправляет участникам со статусами `confirmed`/`requested`/`invited`/`waitlisted` уведомление `system` с `params.action = "event_cancelled"`. Повторная отмена идемпотентна, для `completed` — 409.
**200** — событие в формате `GET /api/events/:id`.

### POST `/api/events/:id/join` — подать заявку

Тело не нужно. Создаёт участие со `status = requested`, организатору уходит уведомление `join_request`. Повторно подать заявку можно после `declined`/`left`. 409, если событие не `planned`, вы организатор или уже участвуете.
**201** — `{ "event_id": 1, "user_id": 7, "status": "requested" }`

### DELETE `/api/events/:id/participants/me` — выйти / отозвать заявку

Ставит `status = left` для статусов `confirmed`/`requested`/`invited`/`waitlisted`. Организатор выйти не может (409, нужно отменить событие). 404, если вы не участник.
**200** — `{ "event_id": 1, "user_id": 7, "status": "left" }`

### GET `/api/events/:id/participants?status=` — список участниц

Организатор видит любые статусы (без `status` — все). Остальные видят только `confirmed`; запрос другого статуса даёт 403. Неверный `status` — 400.
**200**

```json
{ "items": [ { "user_id": 5, "username": "anna", "city": "...", "country_code": "RU", "role": "organizer", "status": "confirmed", "created_at": "...", "responded_at": "..." } ] }
```

### POST `/api/events/:id/invitations` — пригласить

Только организатор, событие должно быть `planned`. Тело: `{ "user_ids": [3, 8] }` (1–50 id). Создаёт `status = invited` и уведомление `invite`. Повторно приглашаются только `declined`/`left`; остальные попадают в `skipped`, как и несуществующие пользователи.
**200** — `{ "invited": [3], "skipped": [8] }`

### PATCH `/api/events/:id/participants/:userId` — ответить на заявку/приглашение

Тело: `{ "status": "confirmed" | "declined" }`.

- Организатор: для заявок `requested`/`waitlisted` — одобрить или отклонить; пользователю уходит `system` с `params.action = join_approved | join_declined`.
- Приглашённая (`userId` = я, текущий статус `invited`): принять или отклонить; организатору уходит `system` с `params.action = invite_accepted | invite_declined`.

409, если переход недопустим, событие не `planned` или при `confirmed` нет мест (`No spots left`). Статус организатора менять нельзя (400).
**200** — `{ "event_id": 1, "user_id": 7, "status": "confirmed" }`

### DELETE `/api/events/:id/participants/:userId` — убрать участницу

Только организатор. Запись участия удаляется, пользователю уходит `system` с `params.action = "removed_from_event"`. Организатора убрать нельзя (400).
**200** — `{ "event_id": 1, "user_id": 7, "removed": true }`

### Уведомления

Все уведомления пишутся в `notifications` (`user_id`, `type`, `actor_id`, `event_id`, `params`). В `params` всегда есть `event_title`, для типа `system` — `action`.

## Транспорт и поездки

Все эндпойнты требуют Bearer JWT. Добавлять и резервировать поездки могут
только подтверждённые участницы события. На одного человека допускается одно
место в поездке на событие. Событие должно иметь статус `planned`.

### GET `/api/events/:id/rides` — поездки и свободные места

Возвращает поездки события, водителей, число свободных мест и список пассажиров.

**200 OK**

```json
{
  "items": [
    {
      "id": 4,
      "event_id": 12,
      "driver_id": 5,
      "driver_username": "anna",
      "seats": 3,
      "free_seats": 2,
      "note": "Стартую от метро",
      "created_at": "...",
      "passengers": [
        { "user_id": 7, "username": "maria", "created_at": "..." }
      ]
    }
  ]
}
```

### POST `/api/events/:id/rides` — предложить поездку

Только подтверждённая участница события. Один водитель может создать одну
поездку на событие.

Тело: `{ "seats": 1..8, "note": "..." }`; `note` необязателен, до 500 символов.

**201 Created** — `{ "ride": { "id", "event_id", "driver_id", "seats", "free_seats", "note", "created_at", "passengers": [] } }`.

Ошибки: **400** некорректные `seats`/`note`, **403** пользователь не подтверждён,
**404** событие не найдено, **409** событие не `planned` или поездка уже создана
этим водителем.

### PATCH `/api/events/:id/rides/:rideId` — изменить поездку

Водитель поездки или организатор события может передать одно или оба поля:
`{ "seats": 1..8, "note": "..." }`. `note: null` очищает примечание. Число мест
нельзя уменьшить ниже числа уже записанных пассажиров.

**200 OK** — `{ "ride": { ...обновлённая поездка... } }`.

Ошибки: **400** неверные поля, **403** недостаточно прав, **404** поездка не
найдена, **409** событие не `planned` или мест меньше текущего числа пассажиров.

### DELETE `/api/events/:id/rides/:rideId` — убрать поездку

Водитель поездки или организатор события. Поездка и её записи пассажиров
удаляются.

**204 No Content**. Ошибки: **403** недостаточно прав, **404** поездка не найдена.

### PUT `/api/events/:id/rides/:rideId/passengers/me` — занять место

Только подтверждённая участница события; нельзя записаться в собственную
поездку. Повторный PUT в ту же поездку идемпотентен. При наличии мест создаётся
запись в `event_ride_passengers`.

**200 OK** — `{ "event_id": 12, "ride_id": 4, "user_id": 7 }`.

Ошибки: **403** пользователь не подтверждён, **404** событие/поездка не найдены,
**409** нет свободных мест, уже выбрана другая поездка на это событие, выбран
собственный автомобиль или событие не `planned`.

### DELETE `/api/events/:id/rides/:rideId/passengers/me` — освободить место

Удаляет бронь текущей участницы.

**200 OK** — `{ "released": true }`. Ошибки: **404** событие или бронь не найдены.

При выходе участницы из события или её удалении организатором бронь снимается;
если она была водителем, её поездка удаляется вместе с пассажирскими бронями.
