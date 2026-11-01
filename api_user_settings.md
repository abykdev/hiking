# User settings and safety API

Все endpoints требуют `Authorization: Bearer <JWT>`. Пользователь определяется
по токену; чужой `user_id` передать нельзя. Ошибки возвращаются как
`{ "error": "..." }`.

Для доверенных контактов нужно применить миграцию
[`migrations/20261101_trusted_contacts.sql`](./migrations/20261101_trusted_contacts.sql).

## GET `/api/users/me/settings`

Возвращает настройки пользователя. Если записи ещё нет, она создаётся с
значениями по умолчанию из `user_settings`.

**200 OK**

```json
{
  "user_id": 42,
  "notif_invites": true,
  "notif_messages": true,
  "notif_reminders": true,
  "notif_weather": true,
  "notif_waitlist": true,
  "profile_visible": true,
  "share_location_default": false,
  "auto_checkin_enabled": true,
  "updated_at": "2026-11-01T00:00:00.000Z"
}
```

## PATCH `/api/users/me/settings`

Частично изменяет настройки. Все поля необязательны, но нужно передать хотя
бы одно. Значения должны быть boolean; неизвестные поля запрещены.

Доступные поля: `notif_invites`, `notif_messages`, `notif_reminders`,
`notif_weather`, `notif_waitlist`, `profile_visible`,
`share_location_default`, `auto_checkin_enabled`.

**Пример**

```json
{
  "notif_messages": false,
  "profile_visible": false
}
```

**200 OK** — обновлённый объект настроек в формате GET.

## GET `/api/users/me/trusted-contacts`

Возвращает список доверенных контактов текущего пользователя.

**200 OK**

```json
{
  "items": [
    {
      "id": "8",
      "name": "Alex",
      "phone": "+123456789",
      "created_at": "2026-11-01T00:00:00.000Z",
      "updated_at": "2026-11-01T00:00:00.000Z"
    }
  ]
}
```

## POST `/api/users/me/trusted-contacts`

Добавляет контакт. `name` обязателен, от 1 до 100 символов; `phone`
обязателен, от 1 до 32 символов. Значения обрезаются по краям.

```json
{
  "name": "Alex",
  "phone": "+123456789"
}
```

**201 Created** — созданный объект контакта.

## PATCH `/api/users/me/trusted-contacts/:id`

Изменяет переданные поля контакта (`name` и/или `phone`); требуется передать
хотя бы одно поле. Возвращает **200 OK** с обновлённым объектом контакта.

## DELETE `/api/users/me/trusted-contacts/:id`

Удаляет контакт. **204 No Content**.

Операции с контактом доступны только владельцу. Для несуществующего контакта
возвращается **404 Not Found**.

## GET `/api/users/me/packing`

Возвращает коды отмеченных элементов чек-листа:

```json
{
  "item_codes": ["first_aid_kit", "water"]
}
```

## PUT `/api/users/me/packing`

Добавляет или снимает отметку чек-листа. `item_code` — непустая строка до
100 символов, `checked` — boolean. Повторный запрос с тем же состоянием
безопасен.

```json
{
  "item_code": "first_aid_kit",
  "checked": true
}
```

**200 OK**

```json
{
  "item_code": "first_aid_kit",
  "checked": true
}
```

## DELETE `/api/users/me/packing`

Снимает все отметки текущего пользователя. **204 No Content**.

## Ошибки

- **400 Bad Request** — неверное тело запроса или неизвестные поля.
- **401 Unauthorized** — JWT отсутствует или недействителен.
- **404 Not Found** — контакт не найден или принадлежит другому пользователю.
