# Lock Rules API

API routes for managing lock rules in FocusLock.

## Endpoints

### GET /api/rules

Fetch all lock rules for the authenticated user.

**Authentication:** Required

**Response:**
```json
{
  "rules": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "app_name": "Instagram",
      "app_icon_url": "https://...",
      "app_scheme": "instagram://",
      "lock_type": "timer",
      "daily_limit_minutes": 30,
      "schedule_start": null,
      "schedule_end": null,
      "schedule_days": null,
      "unlock_date": null,
      "hide_from_home": true,
      "hide_from_search": true,
      "strict_mode": false,
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized`: User not authenticated
- `500 Internal Server Error`: Database error

---

### POST /api/rules

Create a new lock rule.

**Authentication:** Required

**Request Body:**
```json
{
  "app_name": "Instagram",
  "app_icon_url": "https://...",
  "app_scheme": "instagram://",
  "lock_type": "timer",
  "daily_limit_minutes": 30,
  "hide_from_home": true,
  "hide_from_search": true,
  "strict_mode": false
}
```

**Lock Type Requirements:**
- `timer`: Requires `daily_limit_minutes`
- `schedule`: Requires `schedule_start`, `schedule_end`, `schedule_days`
- `until_date`: Requires `unlock_date`
- `nuclear`: No additional fields required

**Response:**
```json
{
  "rule": {
    "id": "uuid",
    "user_id": "uuid",
    "app_name": "Instagram",
    "lock_type": "timer",
    "daily_limit_minutes": 30,
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid lock rule data (validation error)
- `401 Unauthorized`: User not authenticated
- `500 Internal Server Error`: Database error

---

### PUT /api/rules/[id]

Update an existing lock rule.

**Authentication:** Required

**Request Body:**
```json
{
  "daily_limit_minutes": 45,
  "is_active": false
}
```

All fields are optional. Only provided fields will be updated.

**Response:**
```json
{
  "rule": {
    "id": "uuid",
    "user_id": "uuid",
    "app_name": "Instagram",
    "lock_type": "timer",
    "daily_limit_minutes": 45,
    "is_active": false,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-02T00:00:00Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid lock rule data (validation error)
- `401 Unauthorized`: User not authenticated
- `404 Not Found`: Lock rule not found or doesn't belong to user
- `500 Internal Server Error`: Database error

---

### DELETE /api/rules/[id]

Delete a lock rule. Associated override logs will have their `lock_rule_id` set to NULL (cascade behavior).

**Authentication:** Required

**Response:**
```json
{
  "success": true
}
```

**Error Responses:**
- `401 Unauthorized`: User not authenticated
- `404 Not Found`: Lock rule not found or doesn't belong to user
- `500 Internal Server Error`: Database error

---

## Validation

All requests are validated using Zod schemas. Validation errors return a `400 Bad Request` response with details:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid lock rule data",
    "details": {
      "fieldErrors": {
        "daily_limit_minutes": ["Timer lock requires daily_limit_minutes"]
      }
    }
  }
}
```

## Security

- All routes require authentication via Supabase Auth
- Row-level security (RLS) ensures users can only access their own lock rules
- Input validation prevents SQL injection and invalid data
- User ID is automatically set from the authenticated session (cannot be spoofed)

## Examples

### Create a timer lock
```bash
curl -X POST http://localhost:3000/api/rules \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "app_name": "Instagram",
    "lock_type": "timer",
    "daily_limit_minutes": 30
  }'
```

### Create a schedule lock
```bash
curl -X POST http://localhost:3000/api/rules \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "app_name": "YouTube",
    "lock_type": "schedule",
    "schedule_start": "22:00",
    "schedule_end": "06:00",
    "schedule_days": ["mon", "tue", "wed", "thu", "fri"]
  }'
```

### Update a lock rule
```bash
curl -X PUT http://localhost:3000/api/rules/RULE_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "is_active": false
  }'
```

### Delete a lock rule
```bash
curl -X DELETE http://localhost:3000/api/rules/RULE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```
