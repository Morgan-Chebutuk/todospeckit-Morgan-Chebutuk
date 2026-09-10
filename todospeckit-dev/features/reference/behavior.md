# Behavior & Rules Reference

**Living snapshot** of product rules currently in force after **Feature 2**.

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
| Shared `emailRules` on register (required + format) | `frontend/src/config/validation.js` | Feature 1 |
| Username normalized `trim().toLowerCase()` on save | User model hook + auth controller | Feature 1 |

## Ownership & isolation

| Rule | Enforcement | Introduced |
|------|-------------|------------|
| Every authenticated request resolves to `req.user.id` from the session | `authenticate` | Feature 1 |
| Cross-user access → **`404`**, never `403` (do not confirm existence) | Controllers + `getAccessibleListOrNull` | ADR-0002; Feature 2 |
| Lists: reads/writes scoped to `userId = req.user.id`; create ownership from server only | `list.controller` + `getAccessibleListOrNull` | Feature 2 |

## Lists

| Rule | Enforcement | Introduced |
|------|-------------|------------|
| List name trimmed; empty/whitespace rejected | Create/update API + Dashboard dialogs | Feature 2 |
| List name max **100** characters | API + client rules | Feature 2 |
| Lists returned **alphabetically by name** | `findAll` `order: name ASC` | Feature 2 |
| Single-view lists UI (`Dashboard.vue`); list CRUD via dialogs; no sidebar/main split | Dashboard | Feature 2 |
| Empty lists: **"No lists yet. Create your first list."** | Dashboard | Feature 2 |
| List rows expose **Edit list** and **Delete list** icon actions (`size="small"`) | Dashboard | Feature 2 |
| **+ New List** / dialog **Create** use class `oc-cta` | Dashboard | Feature 2 |

## Profile & MenuBar

| Rule | Enforcement | Introduced |
|------|-------------|------------|
| MenuBar: signed-in user's name and standalone **Sign out** | MenuBar | Feature 2 |
| MenuBar hidden on login and register routes | `MenuBar.vue` + `App.vue` | Feature 2 |

## Errors (product convention)

| Rule | Enforcement | Introduced |
|------|-------------|------------|
| Error body shape `{ "message": "Human-readable explanation." }` | Controllers | Feature 1 |
| Duplicate username → `"Username is already taken."`; duplicate email → `"Email is already registered."` | Register | Feature 1 |
| Invalid login → `"Invalid username or password."` (same message for unknown user or bad password) | Login | Feature 1 |
| Empty list name → `"List name is required."`; name too long → `"List name must be 100 characters or fewer."` | List API + Dashboard | Feature 2 |
| Missing/unowned list → `"List with id=<id> not found."` | List API | Feature 2 |

---

## How to use

| Question | Look here |
|----------|-----------|
| What rule is in force now? | This file |
| Why was this rule chosen? | Feature FR / Gherkin, or ADR |
| Exact scenario / test name | Introducing `feature-N-*.md` Test Coverage Map |
| Routes and payloads | [api.md](./api.md) |
| Tables and columns | [data-model.md](./data-model.md) |
