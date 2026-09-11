/**
 * Feature 3 — Todo List Item Management
 * Spec: features/feature-3-todo-list-item-management.md
 */

import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { syncTestDatabase, resetTestDatabase, registerUser, createList, createTodo } from "./helpers.js";

describe("Feature 3 — Todo API", () => {
  beforeAll(async () => {
    await syncTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-3.1 — Add tasks to a list", () => {
    it("User adds a todo to a list via dialog", async () => {
      const user = await registerUser();
      const list = await createList(user.authHeader, "Groceries");

      const response = await createTodo(user.authHeader, list.body.id, "Buy milk");

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: expect.any(Number),
        title: "Buy milk",
        completed: false,
        userId: user.user.userId,
        listId: list.body.id,
      });

      const stored = await db.todo.findByPk(response.body.id);
      expect(stored).not.toBeNull();
      expect(stored.title).toBe("Buy milk");
      expect(stored.completed).toBe(false);
      expect(stored.userId).toBe(user.user.userId);
      expect(stored.listId).toBe(list.body.id);
    });

    it("User adds a todo with an empty title", async () => {
      const user = await registerUser();
      const list = await createList(user.authHeader, "Groceries");

      const empty = await createTodo(user.authHeader, list.body.id, "");
      expect(empty.status).toBe(400);
      expect(empty.body.message).toBe("Todo title is required.");

      const whitespace = await createTodo(user.authHeader, list.body.id, "   ");
      expect(whitespace.status).toBe(400);
      expect(whitespace.body.message).toBe("Todo title is required.");

      expect(await db.todo.count()).toBe(0);
    });
  });

  describe("US-3.2 — View tasks in a list", () => {
    it("User only sees their own todos when opening items", async () => {
      const userA = await registerUser({
        email: "a@example.com",
        username: "usera",
      });
      const userB = await registerUser({
        email: "b@example.com",
        username: "userb",
      });

      const listA = await createList(userA.authHeader, "Work");
      const listB = await createList(userB.authHeader, "Work");
      await createTodo(userA.authHeader, listA.body.id, "My task");
      await createTodo(userB.authHeader, listB.body.id, "Their task");

      const response = await request(app)
        .get(`/todo/lists/${listA.body.id}/todos`)
        .set(userA.authHeader);

      expect(response.status).toBe(200);
      expect(response.body.map((todo) => todo.title)).toEqual(["My task"]);
      expect(response.body.every((todo) => todo.userId === userA.user.userId)).toBe(true);
      expect(response.body.some((todo) => todo.title === "Their task")).toBe(false);
    });
  });

  describe("US-3.3 — Complete tasks", () => {
    it("User marks a todo as complete", async () => {
      const user = await registerUser();
      const list = await createList(user.authHeader, "Groceries");
      const created = await createTodo(user.authHeader, list.body.id, "Buy milk");
      expect(created.body.completed).toBe(false);

      const response = await request(app)
        .put(`/todo/todos/${created.body.id}`)
        .set(user.authHeader)
        .send({ completed: true });

      expect(response.status).toBe(200);
      expect(response.body.completed).toBe(true);
      expect(response.body.title).toBe("Buy milk");

      const stored = await db.todo.findByPk(created.body.id);
      expect(stored.completed).toBe(true);
    });

    it("User marks a completed todo as incomplete", async () => {
      const user = await registerUser();
      const list = await createList(user.authHeader, "Groceries");
      const created = await createTodo(user.authHeader, list.body.id, "Buy milk");

      await request(app)
        .put(`/todo/todos/${created.body.id}`)
        .set(user.authHeader)
        .send({ completed: true });

      const response = await request(app)
        .put(`/todo/todos/${created.body.id}`)
        .set(user.authHeader)
        .send({ completed: false });

      expect(response.status).toBe(200);
      expect(response.body.completed).toBe(false);

      const stored = await db.todo.findByPk(created.body.id);
      expect(stored.completed).toBe(false);
    });
  });

  describe("US-3.4 — Edit and remove tasks", () => {
    it("User edits a todo title", async () => {
      const user = await registerUser();
      const list = await createList(user.authHeader, "Groceries");
      const created = await createTodo(user.authHeader, list.body.id, "Buy milk");

      const response = await request(app)
        .put(`/todo/todos/${created.body.id}`)
        .set(user.authHeader)
        .send({ title: "Buy oat milk" });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe("Buy oat milk");
      expect(response.body.id).toBe(created.body.id);

      const stored = await db.todo.findByPk(created.body.id);
      expect(stored.title).toBe("Buy oat milk");
    });

    it("User deletes a todo", async () => {
      const user = await registerUser();
      const list = await createList(user.authHeader, "Groceries");
      const created = await createTodo(user.authHeader, list.body.id, "Buy milk");

      const response = await request(app)
        .delete(`/todo/todos/${created.body.id}`)
        .set(user.authHeader);

      expect([200, 204]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.message).toBe("Todo deleted successfully.");
      }

      expect(await db.todo.findByPk(created.body.id)).toBeNull();

      const remaining = await request(app)
        .get(`/todo/lists/${list.body.id}/todos`)
        .set(user.authHeader);
      expect(remaining.body.some((todo) => todo.id === created.body.id)).toBe(false);
    });
  });

  describe("US-3.5 — Private items only", () => {
    it("User cannot read todos in another user's list", async () => {
      const userA = await registerUser({
        email: "a@example.com",
        username: "usera",
      });
      const userB = await registerUser({
        email: "b@example.com",
        username: "userb",
      });
      const listB = await createList(userB.authHeader, "Secret");
      await createTodo(userB.authHeader, listB.body.id, "Hidden task");

      const response = await request(app)
        .get(`/todo/lists/${listB.body.id}/todos`)
        .set(userA.authHeader);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe(`List with id=${listB.body.id} not found.`);
      expect(JSON.stringify(response.body)).not.toContain("Hidden task");
    });

    it("User attempts to add a todo to another user's list", async () => {
      const userA = await registerUser({
        email: "a@example.com",
        username: "usera",
      });
      const userB = await registerUser({
        email: "b@example.com",
        username: "userb",
      });
      const listB = await createList(userB.authHeader, "Secret");

      const response = await request(app)
        .post(`/todo/lists/${listB.body.id}/todos`)
        .set(userA.authHeader)
        .send({ title: "Intruder task" });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe(`List with id=${listB.body.id} not found.`);
      expect(await db.todo.count({ where: { listId: listB.body.id } })).toBe(0);
    });

    it("User attempts to rename another user's todo", async () => {
      const userA = await registerUser({
        email: "a@example.com",
        username: "usera",
      });
      const userB = await registerUser({
        email: "b@example.com",
        username: "userb",
      });
      const listB = await createList(userB.authHeader, "Secret");
      const todoB = await createTodo(userB.authHeader, listB.body.id, "Hidden task");

      const response = await request(app)
        .put(`/todo/todos/${todoB.body.id}`)
        .set(userA.authHeader)
        .send({ title: "Hijacked" });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe(`Todo with id=${todoB.body.id} not found.`);

      const stored = await db.todo.findByPk(todoB.body.id);
      expect(stored.title).toBe("Hidden task");
      expect(stored.userId).toBe(userB.user.userId);
    });

    it("User attempts to delete another user's todo", async () => {
      const userA = await registerUser({
        email: "a@example.com",
        username: "usera",
      });
      const userB = await registerUser({
        email: "b@example.com",
        username: "userb",
      });
      const listB = await createList(userB.authHeader, "Secret");
      const todoB = await createTodo(userB.authHeader, listB.body.id, "Hidden task");

      const response = await request(app)
        .delete(`/todo/todos/${todoB.body.id}`)
        .set(userA.authHeader);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe(`Todo with id=${todoB.body.id} not found.`);
      expect(await db.todo.findByPk(todoB.body.id)).not.toBeNull();
    });

    it("Client cannot assign a todo to another user on create", async () => {
      const userA = await registerUser({
        email: "a@example.com",
        username: "usera",
      });
      const listA = await createList(userA.authHeader, "Groceries");

      const response = await request(app)
        .post(`/todo/lists/${listA.body.id}/todos`)
        .set(userA.authHeader)
        .send({ title: "Buy milk", userId: 999 });

      expect(response.status).toBe(201);
      expect(response.body.userId).toBe(userA.user.userId);
      expect(response.body.userId).not.toBe(999);

      const stored = await db.todo.findByPk(response.body.id);
      expect(stored.userId).toBe(userA.user.userId);
    });

    it("Unauthenticated API request for todos", async () => {
      const response = await request(app).get("/todo/lists/1/todos");

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/Unauthorized/i);
    });
  });

  describe("US-3.6 — Lists carry their items", () => {
    it("Deleting a list removes its todos", async () => {
      const user = await registerUser();
      const list = await createList(user.authHeader, "Groceries");
      const milk = await createTodo(user.authHeader, list.body.id, "Buy milk");
      const eggs = await createTodo(user.authHeader, list.body.id, "Buy eggs");

      const response = await request(app)
        .delete(`/todo/lists/${list.body.id}`)
        .set(user.authHeader);

      expect([200, 204]).toContain(response.status);
      expect(await db.todo.findByPk(milk.body.id)).toBeNull();
      expect(await db.todo.findByPk(eggs.body.id)).toBeNull();

      const remaining = await request(app)
        .get(`/todo/lists/${list.body.id}/todos`)
        .set(user.authHeader);
      expect(remaining.status).toBe(404);
    });
  });
});
