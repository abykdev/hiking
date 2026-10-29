# Countries API

## GET `/api/countries`

Returns active countries, localized for the requested language.

### Query parameters

| Parameter | Type | Required | Description |
|---|---|---:|---|
| `lang` | `en` \| `ru` | No | Localized country name. Defaults to `en`. |
| `with_counts` | `1` | No | Include the number of public routes in each country as `route_count`. |

### Example

```http
GET /api/countries?lang=ru&with_counts=1
```

### Success response — `200 OK`

```json
{
  "countries": [
    {
      "code": "RU",
      "alpha3": "RUS",
      "flag": "...",
      "name": "Россия",
      "center_lat": 61.524,
      "center_lon": 105.319,
      "route_count": 24
    }
  ]
}
```

`route_count` is returned only when `with_counts=1`.

## GET `/api/countries/:code`

Returns one active country by its two-letter country code.

### Path parameters

| Parameter | Type | Required | Description |
|---|---|---:|---|
| `code` | string | Yes | Two-letter country code, case-insensitive, e.g. `RU`. |

### Query parameters

| Parameter | Type | Required | Description |
|---|---|---:|---|
| `lang` | `en` \| `ru` | No | Localized country name. Defaults to `en`. |

### Example

```http
GET /api/countries/RU?lang=ru
```

### Success response — `200 OK`

```json
{
  "country": {
    "code": "RU",
    "alpha3": "RUS",
    "flag": "...",
    "name": "Россия",
    "center_lat": 61.524,
    "center_lon": 105.319
  }
}
```

### Errors

- `400 Bad Request` — invalid country code or unsupported `lang`.
- `404 Not Found` — country code is unknown or the country is inactive.

Neither endpoint requires authentication.

---

# Files API

All endpoints use the `/api/files` prefix. Send the JWT as
`Authorization: Bearer <JWT>`.

## POST `/api/files` — upload a file

Admin access is required. Upload one file as `multipart/form-data`; no other
fields are read. The maximum file size is 20 MiB.

### Example

```http
POST /api/files
Authorization: Bearer <JWT>
Content-Type: multipart/form-data

file: <binary file>
```

The multipart file field can have any name; the endpoint reads the first file
part.

### Success response — `201 Created`

```json
{
  "id": "a8f4c136-9404-41d9-84d4-520fed9fc3c8",
  "original_name": "map.gpx",
  "stored_path": "uploads/a8f4c136-9404-41d9-84d4-520fed9fc3c8.gpx",
  "mime_type": "application/gpx+xml",
  "size_bytes": 2048,
  "created_at": "2026-10-29T15:00:00.000Z"
}
```

Keep the returned `id` to associate the uploaded file with a route or event.
`stored_path` is a storage key, not a guaranteed public URL.

### Errors

- `400 Bad Request` — no file was sent: `{ "error": "No file uploaded" }`.
- `401 Unauthorized` — JWT is missing or invalid.
- `403 Forbidden` — the authenticated user is not an administrator.
- `413 Payload Too Large` — file exceeds 20 MiB: `{ "error": "File too large" }`.

## GET `/api/files/:id` — get file metadata

Any authenticated user can retrieve metadata by the file UUID. This endpoint
returns metadata only; it does not stream or download file contents.

### Success response — `200 OK`

The response is a file metadata object with the same fields as the upload
response.

### Errors

- `401 Unauthorized` — JWT is missing or invalid.
- `404 Not Found` — file does not exist: `{ "error": "Not found" }`.

## DELETE `/api/files/:id` — delete a file

Admin access is required. Deletes the file record and removes the stored file.

### Success response — `204 No Content`

The response has no body.

### Errors

- `401 Unauthorized` — JWT is missing or invalid.
- `403 Forbidden` — the authenticated user is not an administrator.
- `404 Not Found` — file does not exist: `{ "error": "Not found" }`.