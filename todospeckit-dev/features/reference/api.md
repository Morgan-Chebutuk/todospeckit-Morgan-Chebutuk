# API Reference

**Base path:** `/todo/`  
**Status:** Integrated API through **Feature 4** (authentication, list CRUD, todo item CRUD, and user profile).  
**Authority for new work:** feature specs in `features/` — update this file in the same PR when routes or payloads change.

**Auth:** Send `Authorization: Bearer <token>` on protected routes.  
**Errors:** `{ "message": "Human-readable explanation." }` unless noted.

## Feature provenance

| Area | Feature |
|------|---------|
| Register, login, logout | 1 |
| List CRUD (`GET/POST/PUT/DELETE /todo/lists`) | 2 |
| Todo CRUD (`GET/POST /todo/lists/:listId/todos`, `PUT/DELETE /todo/todos/:id`) | 3 |
| User profile (`GET/PUT /todo/users/:id`) | 4 |

---

## Authentication (Feature 1)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/todo/register` | No | Create account |
| `POST` | `/todo/login` | No | Sign in; returns session payload |
| `POST` | `/todo/logout` | Yes | Invalidate session token |

**Register body:**
```json
{
  "fName": "Jane",
  "lName": "Doe",
  "email": "jdoe@example.com",
  "username": "jdoe",
  "password": "password123"
}
```

**Login body:**
```json
{
  "username": "jdoe",
  "password": "password123"
}
```

**Register / login success** (`201` register · `200` login):
```json
{
  "userId": 1,
  "username": "jdoe",
  "email": "jdoe@example.com",
  "fName": "Jane",
  "lName": "Doe",
  "role": "worker",
  "token": "<jwt>"
}
```

**Logout success** (`200`):
```json
{
  "message": "Signed out successfully."
}
```

**Common auth errors:** missing fields `400`; password < 8 chars `400`; duplicate username/email `400`; invalid login `401` with `"Invalid username or password."`; missing/invalid token on protected routes `401`.

---

## Lists (Feature 2)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/todo/lists` | Yes | Lists owned by the caller (array, ordered by `name` ASC) |
| `POST` | `/todo/lists` | Yes | Create a new list |
| `PUT` | `/todo/lists/:listId` | Yes | Rename a list |
| `DELETE` | `/todo/lists/:listId` | Yes | Delete a list owned by the caller |

**Create / rename body:**
```json
{ "name": "Groceries" }
```

`userId` in the request body is ignored. Ownership is always `req.user.id`.

**List success** (`200` / `201`):
```json
{
  "id": 1,
  "name": "Groceries",
  "userId": 42,
  "createdAt": "2026-07-02T12:00:00.000Z",
  "updatedAt": "2026-07-02T12:00:00.000Z"
}
```

**Delete success** (`200`):
```json
{ "message": "List deleted successfully." }
```

**Validation errors:** empty/whitespace name `400` with `"List name is required."`; name > 100 chars `400` with `"List name must be 100 characters or fewer."`; invalid `listId` `400` with `"List id is invalid."`; unowned or missing list `404` with `"List with id=<id> not found."`

**Unauthenticated / expired token:** `401` with `{ "message": "Unauthorized! …" }`.

Deleting a list also deletes its todos (database cascade).

---

## Todos (Feature 3)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/todo/lists/:listId/todos` | Yes | Todos in an owned list (incomplete first, then `createdAt` ASC) |
| `POST` | `/todo/lists/:listId/todos` | Yes | Add a todo to an owned list |
| `PUT` | `/todo/todos/:id` | Yes | Update title and/or `completed` |
| `DELETE` | `/todo/todos/:id` | Yes | Delete a todo owned by the caller |

**Create body:**
```json
{ "title": "Buy milk" }
```

`userId` and `listId` in the request body are ignored. Ownership is always `req.user.id`; `listId` comes from the owned parent list. New todos default `completed: false`.

**Update body** (either or both fields):
```json
{ "title": "Buy oat milk", "completed": true }
```

**Todo success** (`200` / `201`):
```json
{
  "id": 10,
  "listId": 1,
  "title": "Buy milk",
  "completed": false,
  "userId": 42,
  "createdAt": "2026-07-02T12:05:00.000Z",
  "updatedAt": "2026-07-02T12:05:00.000Z"
}
```

**Delete success** (`200`):
```json
{ "message": "Todo deleted successfully." }
```

**Validation errors:** empty/whitespace title `400` with `"Todo title is required."`; title > 255 chars `400` with `"Todo title must be 255 characters or fewer."`; invalid `listId` `400` with `"List id is invalid."`; invalid todo id `400` with `"Todo id is invalid."`; unowned or missing parent list `404` with `"List with id=<id> not found."`; unowned or missing todo `404` with `"Todo with id=<id> not found."`

**Unauthenticated / expired token:** `401` with `{ "message": "Unauthorized! …" }`.

---

## User profile (Feature 4)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/todo/users/:id` | Yes | Fetch the caller's profile |
| `PUT` | `/todo/users/:id` | Yes | Update the caller's profile |

Self-access only: `:id` must equal `req.user.id`.

**Update body:**
```json
{
  "fName": "Jane",
  "lName": "Doe",
  "email": "jane@example.com",
  "username": "jdoe",
  "password": "newpassword123"
}
```

`fName`, `lName`, `email`, and `username` are required. `password` is optional — omit it to leave the current hash unchanged. `role` in the body is ignored.

**Profile success** (`200`):
```json
{
  "id": 42,
  "fName": "Jane",
  "lName": "Doe",
  "email": "jane@example.com",
  "username": "jdoe",
  "role": "worker",
  "createdAt": "2026-07-02T12:00:00.000Z",
  "updatedAt": "2026-07-02T12:05:00.000Z"
}
```

Password hash is never returned.

**Validation errors:** empty/whitespace first name `400` with `"First name is required."` (same pattern for last name, email, username); password present and fewer than 8 characters `400` with `"Password must be at least 8 characters."`; duplicate username `400` with `"Username is already taken."`; duplicate email `400` with `"Email is already registered."`; invalid `id` `400` with `"User id is invalid."`; unowned or missing user `404` with `"User with id=<id> not found."`

**Unauthenticated / expired token:** `401` with `{ "message": "Unauthorized! …" }`.
