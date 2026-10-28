## POST /api/routes

Создать маршрут.

**Auth:** Bearer token
**Content-Type:** multipart/form-data

**Body:**
- `name` (string, required, 1-100 chars)
- `description` (string, optional)
- `file` (File, optional) — GPX
- `hike_style` [integer,optional] list of ids
- `country_code` [string,optional] 

**Response 201:**
{
  "id": 6,
  "name": "Sunset trail",
  "description": "...",
  "user_id": 2,
  "gpx_file_id": 12,
  "geojson_file_id": 13,
  "created_at": "2026-10-15T...",
  "start_lon": 44.763751,
  "start_lat": 41.1514168,
  "length_m": 8115

}

**Response 400:**
{ "error": "name is required" }

**Response 401:**
{ "error": "Unauthorized" }

## GET /api/routes?param1=value1&param2=value2
Получить список маршрутов с фильтром заданным параметрами или без фильтра
**Auth:** Bearer token
**whitelisted query parameters to filer (all are optional)**
- lang 
- user_id 
- country_code
- min_length_m 
- max_length_m 
- created_after 
- created_before
- limit
- offset
- hike_style_id (multiple, comma separated ids)

**Response 201:**
[
  {
    "id": 6,
    "name": "Sunset trail",
    "description": "...",
    "user_id": 2,
    "gpx_file_id": 12,
    "geojson_file_id": 13,
    "created_at": "2026-10-15T...",
    "start_lon": 44.763751,
    "start_lat": 41.1514168,
    "length_m": 8115,
    "elevation_gain_m": 1234
  },
]

## GET /api/routes/:id
Получить маршрут по id
**Auth:** Bearer token

**Response 201:**
  {
    "id": 6,
    "name": "Sunset trail",
    "description": "...",
    "user_id": 2,
    "gpx_file_id": 12,
    "geojson_file_id": 13,
    "created_at": "2026-10-15T...",
    "start_lon": 44.763751,
    "start_lat": 41.1514168,
    "length_m": 8115,
    "elevation_gain_m": 1234
  }
  ## PATCH /api/routes/:id
  Редактировать маршрут
  