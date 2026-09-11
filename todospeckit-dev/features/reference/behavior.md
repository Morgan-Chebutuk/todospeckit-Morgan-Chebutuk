# Behavior & Rules Reference

**Living snapshot** of product rules currently in force after **Feature 5**.

These files answer: *"What rules does the app enforce right now?"*  
They do **not** authorize new scope — implement only from `features/feature-*.md` (**FR-00N** + Gherkin). Deep scenarios stay in the introducing feature; this file is an **index**.

**Related:** [ADR-0002 — Security architecture](../../docs/adr/0002-security-architecture.md)

---

## Maintenance

| When | Action |
|------|--------|
| Feature changes a product rule (sort, ownership, validation, UI rule) | Update this file in the **same PR** |
| Feature only changes routes/payloads/schema | Update [api.md](./api.md) / [data-model.md](./data-model.md); touch this file only if rules changed |
| Drift suspected | Compare this file → code + mapped tests; fix reference or code |

---

## Auth & sessions

| Rule | Enforcement | Introduced |
|------|-------------|------------|
| Login is **username + password** (not email-only) | Auth API + Login UI | Feature 1 |
| Passwords hashed with bcrypt (`SALT_ROUNDS = 10`); hash never returned | Register/login APIs; user `defaultScope` | Feature 1 |
| Session = JWT stored server-side; client sends `Authorization: Bearer <token>` | `authenticate` middleware + `sessions` table | Feature 1 |
| Session lifetime **24 hours** from creation | Session create on register/login | Feature 1 |
| Login reuses a non-expired session for the same user when one exists | Login controller | Feature 1 |
| Logout invalidates the server session and clears client `user` storage | Logout API + `authServices.logoutUser` | Feature 1 |
| Unauthenticated protected API → `401` | `authenticate` | Feature 1 |
| Unauthenticated protected UI → redirect to login | Router `beforeEach` | Feature 1 |
| Signed-in user visiting login/register → redirect to home | Router `beforeEach` | Feature 1 |
| Default role for new users is `worker` | Register | Feature 1 |
| Session stored in `localStorage` key `user` | Login/register views | Feature 1 |
| Shared `emailRules` on register and Edit Profile (required + format) | `frontend/src/config/validation.js` | Features 1, 4 |
| Username normalized `trim().toLowerCase()` on save | User model hook + auth and profile controllers | Features 1, 4 |

## Ownership & isolation

| Rule | Enforcement | Introduced |
|------|-------------|------------|
| Every authenticated request resolves to `req.user.id` from the session | `authenticate` | Feature 1 |
| Cross-user access → **`404`**, never `403` (do not confirm existence) | Controllers + `getAccessibleListOrNull` / `getAccessibleTodoOrNull` / `getAccessibleUserOrNull` | ADR-0002; Features 2–4 |
| Lists: reads/writes scoped to `userId = req.user.id`; create ownership from server only | `list.controller` + `getAccessibleListOrNull` | Feature 2 |
| Todos: reads/writes scoped to `userId = req.user.id`; create requires an owned parent list; `userId` / `listId` from server only | `todo.controller` + `getAccessibleListOrNull` / `getAccessibleTodoOrNull` | Feature 3 |
| Profile: `GET`/`PUT /todo/users/:id` only when `:id === req.user.id` | `user.controller` + `getAccessibleUserOrNull` | Feature 4 |

## Lists

| Rule | Enforcement | Introduced |
|------|-------------|------------|
| List name trimmed; empty/whitespace rejected | Create/update API + Dashboard dialogs | Feature 2 |
| List name max **100** characters | API + client rules | Feature 2 |
| Lists returned **alphabetically by name** | `findAll` `order: name ASC` | Feature 2 |
| Single-view lists UI (`Dashboard.vue`); list CRUD via dialogs; no sidebar/main split | Dashboard | Feature 2 |
| Empty lists: **"No lists yet. Create your first list."** | Dashboard | Feature 2 |
| List rows expose **Edit list** and **Delete list** icon actions (`size="small"`) | Dashboard | Feature 2 |
| List rows expose an **Items** icon (`aria-label` **View items for &lt;list name&gt;**) that opens the list-items dialog | Dashboard | Feature 3 |
| **+ New List** / dialog **Create** use class `oc-cta` | Dashboard | Feature 2 |
| Deleting a list removes its todos | `List hasMany Todo` CASCADE | Feature 3 |

## Todos

| Rule | Enforcement | Introduced |
|------|-------------|------------|
| Todo title trimmed; empty/whitespace rejected | Create/update API + list-items dialogs | Feature 3 |
| Todo title max **255** characters | API + client rules | Feature 3 |
| New todos default `completed: false` | Todo create | Feature 3 |
| Todos returned **incomplete first**, then `createdAt` ASC | `findAll` order | Feature 3 |
| **+ Add Item** is only inside the list-items dialog (not on the main lists view) | Dashboard + `ListItemsDialog` | Feature 3 |
| List-items dialog title **&lt;list name&gt; — Items**; **+ Add Item** / **Add** use class `oc-cta` | `ListItemsDialog` | Feature 3 |
| Empty todos: **"No todos in this list yet."** | `ListItemsDialog` | Feature 3 |
| Completed todos show struck-through or muted title styling | `ListItemsDialog` | Feature 3 |
| Opening items for another list fetches only that list's todos | `todoServices.getAll(listId)` | Feature 3 |
| `dueDate` is optional; `null` means no due date | Todo create/update API + add/edit item dialogs | Feature 5 |
| Dates are calendar-only `YYYY-MM-DD` (no time-of-day); invalid strings rejected | Todo controller calendar check + `optionalDueDateRules` | Feature 5 |
| `PUT` omit `dueDate` → unchanged; `dueDate: null` → clear | Todo update API + `todoServices` | Feature 5 |
| Due date shown on the todo row when set (locale-formatted, e.g. `Jul 15, 2026`) | `ListItemsDialog` + `formatDueDate` | Feature 5 |
| Incomplete todos with `dueDate` before today (browser local calendar) use overdue styling (`text-error` on the date); completed todos do not, even if the date is in the past | `ListItemsDialog` + `isTodoOverdue` | Feature 5 |
| Add-item and edit-item dialogs include an optional **Due date** field beside the title; empty creates/clears to no due date | `ListItemsDialog` | Feature 5 |

## Profile & MenuBar

| Rule | Enforcement | Introduced |
|------|-------------|------------|
| MenuBar hidden on login and register routes | `MenuBar.vue` + `App.vue` | Feature 2 |
| MenuBar shows a **user icon** that opens a profile dropdown (full name, username, email) | MenuBar | Feature 4 |
| **Edit Profile** (`oc-cta`) opens a dialog; fields pre-filled from session / `GET /todo/users/:id` | MenuBar + `userServices` | Feature 4 |
| Profile fields trimmed; required strings rejected when empty | Profile `PUT` + Edit Profile dialog | Feature 4 |
| Password on profile update is optional; if set, min **8** chars and bcrypt hash; confirm must match | Profile `PUT` + dialog rules | Feature 4 |
| After profile save: refresh `localStorage` `user` (keep token) and dispatch `user-logged-in` | MenuBar | Feature 4 |
| Logout lives only in the profile dropdown as **Log out** (no menu-bar **Sign out**) | MenuBar + `authServices.logoutUser` | Feature 4 |
| Role is read-only on profile update | Profile `PUT` | Feature 4 |

## Errors (product convention)

| Rule | Enforcement | Introduced |
|------|-------------|------------|
| Error body shape `{ "message": "Human-readable explanation." }` | Controllers | Feature 1 |
| Duplicate username → `"Username is already taken."`; duplicate email → `"Email is already registered."` | Register + profile `PUT` | Features 1, 4 |
| Invalid login → `"Invalid username or password."` (same message for unknown user or bad password) | Login | Feature 1 |
| Empty list name → `"List name is required."`; name too long → `"List name must be 100 characters or fewer."` | List API + Dashboard | Feature 2 |
| Missing/unowned list → `"List with id=<id> not found."` | List API; todo create/list fetch | Feature 2–3 |
| Empty todo title → `"Todo title is required."`; title too long → `"Todo title must be 255 characters or fewer."` | Todo API + `ListItemsDialog` | Feature 3 |
| Invalid due date → `"Due date must be a valid date in YYYY-MM-DD format."` | Todo create/update API | Feature 5 |
| Missing/unowned todo → `"Todo with id=<id> not found."` | Todo API | Feature 3 |
| Empty profile first name → `"First name is required."` (same pattern for last name, email, username) | Profile `PUT` + Edit Profile dialog | Feature 4 |
| Profile password too short → `"Password must be at least 8 characters."` | Profile `PUT` + Edit Profile dialog | Feature 4 |
| Missing/unowned user → `"User with id=<id> not found."` | Profile API | Feature 4 |

---

## How to use

| Question | Look here |
|----------|-----------|
| What rule is in force now? | This file |
| Why was this rule chosen? | Feature FR / Gherkin, or ADR |
| Exact scenario / test name | Introducing `feature-N-*.md` Test Coverage Map |
| Routes and payloads | [api.md](./api.md) |
| Tables and columns | [data-model.md](./data-model.md) |
