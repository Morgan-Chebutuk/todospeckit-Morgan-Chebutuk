/**
 * Feature 2 — Todo List Management
 * Spec: features/feature-2-todo-list-management.md
 */

import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { syncTestDatabase, resetTestDatabase, registerUser, createList } from "./helpers.js";

describe("Feature 2 — List API", () => {
  beforeAll(async () => {
    await syncTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-2.1 — Create todo lists", () => {
    it("User creates a new list", async () => {
      const user = await registerUser();

      const response = await createList(user.authHeader, "Groceries");

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: expect.any(Number),
        name: "Groceries",
        userId: user.user.userId,
      });

      const stored = await db.list.findByPk(response.body.id);
      expect(stored).not.toBeNull();
      expect(stored.userId).toBe(user.user.userId);
      expect(stored.name).toBe("Groceries");
    });

    it("User creates a list with an empty name", async () => {
      const user = await registerUser();

      const empty = await createList(user.authHeader, "");
      expect(empty.status).toBe(400);
      expect(empty.body.message).toBe("List name is required.");

      const whitespace = await createList(user.authHeader, "   ");
      expect(whitespace.status).toBe(400);
      expect(whitespace.body.message).toBe("List name is required.");

      expect(await db.list.count()).toBe(0);
    });

    it("User creates a list with a name that is too long", async () => {
      const user = await registerUser();
      const tooLong = "a".repeat(101);

      const response = await createList(user.authHeader, tooLong);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("List name must be 100 characters or fewer.");
      expect(await db.list.count()).toBe(0);
    });
  });

  describe("US-2.2 — View my lists", () => {
    it("Dashboard loads with existing lists", async () => {
      const user = await registerUser();
      await createList(user.authHeader, "Work");
      await createList(user.authHeader, "Personal");

      const response = await request(app).get("/todo/lists").set(user.authHeader);

      expect(response.status).toBe(200);
      expect(response.body.map((list) => list.name)).toEqual(["Personal", "Work"]);
      expect(response.body.every((list) => list.userId === user.user.userId)).toBe(true);
    });

    it("User cannot see another user's lists", async () => {
      const userA = await registerUser({
        email: "a@example.com",
        username: "usera",
      });
      const userB = await registerUser({
        email: "b@example.com",
        username: "userb",
      });

      await createList(userA.authHeader, "Work");
      await createList(userB.authHeader, "Secret Project");

      const response = await request(app).get("/todo/lists").set(userA.authHeader);

      expect(response.status).toBe(200);
      expect(response.body.every((list) => list.userId === userA.user.userId)).toBe(true);
      expect(response.body.some((list) => list.name === "Secret Project")).toBe(false);
      expect(response.body.map((list) => list.name)).toEqual(["Work"]);
    });
  });

  describe("US-2.4 — Rename and delete lists", () => {
    it("User renames a list", async () => {
      const user = await registerUser();
      const created = await createList(user.authHeader, "Groceries");

      const response = await request(app)
        .put(`/todo/lists/${created.body.id}`)
        .set(user.authHeader)
        .send({ name: "Shopping" });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: created.body.id,
        name: "Shopping",
        userId: user.user.userId,
      });

      const stored = await db.list.findByPk(created.body.id);
      expect(stored.name).toBe("Shopping");
    });

    it("User deletes a list", async () => {
      const user = await registerUser();
      const created = await createList(user.authHeader, "Groceries");

      const response = await request(app)
        .delete(`/todo/lists/${created.body.id}`)
        .set(user.authHeader);

      expect([200, 204]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.message).toBe("List deleted successfully.");
      }

      expect(await db.list.findByPk(created.body.id)).toBeNull();

      const remaining = await request(app).get("/todo/lists").set(user.authHeader);
      expect(remaining.body.some((list) => list.id === created.body.id)).toBe(false);
    });
  });

  describe("US-2.5 — Private lists only", () => {
    it("User attempts to rename another user's list", async () => {
      const userA = await registerUser({
        email: "a@example.com",
        username: "usera",
      });
      const userB = await registerUser({
        email: "b@example.com",
        username: "userb",
      });
      const listB = await createList(userB.authHeader, "Secret Project");

      const response = await request(app)
        .put(`/todo/lists/${listB.body.id}`)
        .set(userA.authHeader)
        .send({ name: "Hijacked" });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe(`List with id=${listB.body.id} not found.`);

      const stored = await db.list.findByPk(listB.body.id);
      expect(stored.name).toBe("Secret Project");
      expect(stored.userId).toBe(userB.user.userId);
    });

    it("User attempts to delete another user's list", async () => {
      const userA = await registerUser({
        email: "a@example.com",
        username: "usera",
      });
      const userB = await registerUser({
        email: "b@example.com",
        username: "userb",
      });
      const listB = await createList(userB.authHeader, "Secret Project");

      const response = await request(app)
        .delete(`/todo/lists/${listB.body.id}`)
        .set(userA.authHeader);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe(`List with id=${listB.body.id} not found.`);
      expect(await db.list.findByPk(listB.body.id)).not.toBeNull();
    });

    it("Client cannot assign a list to another user on create", async () => {
      const userA = await registerUser({
        email: "a@example.com",
        username: "usera",
      });

      const response = await request(app)
        .post("/todo/lists")
        .set(userA.authHeader)
        .send({ name: "Groceries", userId: 999 });

      expect(response.status).toBe(201);
      expect(response.body.userId).toBe(userA.user.userId);
      expect(response.body.userId).not.toBe(999);

      const stored = await db.list.findByPk(response.body.id);
      expect(stored.userId).toBe(userA.user.userId);
    });

    it("Unauthenticated API request to lists", async () => {
      const response = await request(app).get("/todo/lists");

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/Unauthorized/i);
    });
  });
});
