# Family Mode API

This API provides parental control features allowing parents to monitor their children's app usage and compliance with lock rules.

## Endpoints

### POST /api/family/add-child

Link a child account to the authenticated parent account.

**Authentication:** Required (parent account)

**Request Body:**
```json
{
  "child_email": "child@example.com"
}
```

**Response (201 Created):**
```json
{
  "child_profile": {
    "id": "uuid",
    "parent_user_id": "uuid",
    "child_user_id": "uuid",
    "created_at": "2024-01-15T10:00:00Z"
  },
  "child_info": {
    "id": "uuid",
    "full_name": "Child Name",
    "avatar_url": "https://..."
  }
}
```

**Error Responses:**
- `400 VALIDATION_ERROR`: Missing or invalid email
- `403 FORBIDDEN`: Child already linked to another parent
- `404 NOT_FOUND`: Child account not found

**Requirements Implemented:**
- 16.1: Parents can link child accounts

---

### GET /api/family/children

List all child accounts linked to the authenticated parent.

**Authentication:** Required (parent account)

**Response (200 OK):**
```json
{
  "children": [
    {
      "id": "uuid",
      "child_user_id": "uuid",
      "full_name": "Child Name",
      "avatar_url": "https://...",
      "timezone": "Asia/Kolkata",
      "created_at": "2024-01-01T00:00:00Z",
      "linked_at": "2024-01-15T10:00:00Z"
    }
  ]
}
```

**Requirements Implemented:**
- 16.1: Parents can link child accounts (view linked children)

---

### GET /api/family/child-stats

Get compliance statistics for a specific child account.

**Authentication:** Required (parent account)

**Query Parameters:**
- `child_user_id` (required): UUID of the child account

**Example:**
```
GET /api/family/child-stats?child_user_id=uuid
```

**Response (200 OK):**
```json
{
  "child_info": {
    "id": "uuid",
    "full_name": "Child Name",
    "avatar_url": "https://..."
  },
  "lock_rules": [
    {
      "id": "uuid",
      "app_name": "Instagram",
      "lock_type": "timer",
      "is_active": true,
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "recent_overrides": [
    {
      "id": "uuid",
      "app_name": "Instagram",
      "mood": "bored",
      "overridden_at": "2024-01-15T14:30:00Z"
    }
  ],
  "compliance": {
    "current_streak": 5,
    "longest_streak": 10,
    "total_overrides_this_week": 3,
    "total_overrides_all_time": 15,
    "compliance_percentage": 71.4
  }
}
```

**Error Responses:**
- `400 VALIDATION_ERROR`: Missing child_user_id parameter
- `403 FORBIDDEN`: Child not linked to authenticated parent

**Privacy Features:**
- Does NOT include `reason_text` from overrides (respects child privacy per Requirement 16.6)
- Shows only app names, lock types, and compliance metrics
- No detailed content or personal notes

**Requirements Implemented:**
- 16.2: Parents can view child's lock rules and compliance
- 16.6: Family mode respects child privacy (no detailed content)

---

## Database Schema

### child_profiles Table

```sql
CREATE TABLE child_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  child_user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_user_id)
);
```

**Constraints:**
- Each child can only be linked to one parent (UNIQUE constraint on child_user_id)
- Cascade delete when parent or child account is deleted

---

## Row-Level Security

The following RLS policies are defined in `20240101000001_rls_policies.sql`:

```sql
-- Parents can manage child profiles
CREATE POLICY "Parents can manage child profiles" ON child_profiles
  FOR ALL USING (auth.uid() = parent_user_id);

-- Children can view own profile link
CREATE POLICY "Children can view own profile link" ON child_profiles
  FOR SELECT USING (auth.uid() = child_user_id);

-- Parents can manage child lock rules
CREATE POLICY "Parents can manage child lock rules" ON lock_rules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM child_profiles
      WHERE parent_user_id = auth.uid()
      AND child_user_id = lock_rules.user_id
    )
  );
```

---

## Implementation Notes

### Requirement Coverage

- **16.1**: ✅ Parents can link child accounts via POST /api/family/add-child
- **16.2**: ✅ Parents can view child's lock rules and compliance via GET /api/family/child-stats
- **16.3**: ⚠️ Parent notifications when child overrides (requires notification system - future task)
- **16.4**: ✅ Children cannot disable family mode (enforced by RLS policies)
- **16.5**: ⚠️ Parents can set bedtime schedules (requires bedtime mode implementation - future task)
- **16.6**: ✅ Family mode respects child privacy (no reason_text in override logs)

### Future Enhancements

1. **Real-time Notifications (Req 16.3)**
   - Implement Supabase Realtime subscription for parent notifications
   - Trigger notification when child overrides a lock rule
   - Similar to buddy notification system

2. **Bedtime Schedules (Req 16.5)**
   - Add bedtime configuration to child_profiles table
   - Implement parent-controlled bedtime mode
   - Auto-lock entertainment apps at configured bedtime

3. **Child Account Restrictions (Req 16.4)**
   - Prevent children from unlinking parent relationship
   - Prevent children from modifying parent-created rules
   - Add UI indicators for parent-managed rules

---

## Testing

### Manual Testing

1. **Add Child Account:**
   ```bash
   curl -X POST http://localhost:3000/api/family/add-child \
     -H "Authorization: Bearer <parent_token>" \
     -H "Content-Type: application/json" \
     -d '{"child_email": "child@example.com"}'
   ```

2. **List Children:**
   ```bash
   curl http://localhost:3000/api/family/children \
     -H "Authorization: Bearer <parent_token>"
   ```

3. **Get Child Stats:**
   ```bash
   curl "http://localhost:3000/api/family/child-stats?child_user_id=<uuid>" \
     -H "Authorization: Bearer <parent_token>"
   ```

### Unit Tests

Create tests in `app/api/family/__tests__/`:
- Test successful child linking
- Test duplicate child linking prevention
- Test unauthorized access (non-parent trying to view child stats)
- Test privacy (verify reason_text is not exposed)
- Test RLS policies

---

## Security Considerations

1. **Authentication**: All endpoints require valid authentication
2. **Authorization**: Parents can only access their own linked children
3. **Privacy**: Child's detailed override reasons are not exposed to parents
4. **RLS**: Database-level security prevents unauthorized access
5. **Email Validation**: Prevents invalid email formats
6. **Self-Linking Prevention**: Users cannot link themselves as children

---

## Error Handling

All endpoints follow the standard error response format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": "Optional additional details"
  }
}
```

**Common Error Codes:**
- `AUTH_REQUIRED`: User not authenticated
- `VALIDATION_ERROR`: Invalid input data
- `FORBIDDEN`: User lacks permission
- `NOT_FOUND`: Resource doesn't exist
- `DATABASE_ERROR`: Database operation failed
- `INTERNAL_ERROR`: Unexpected server error
