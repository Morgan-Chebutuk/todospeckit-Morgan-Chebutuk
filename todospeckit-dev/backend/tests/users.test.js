/**
 * Feature 4 — User Profile Management
 * Spec: features/feature-4-user-profile-management.md
 */

import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { syncTestDatabase, resetTestDatabase, registerUser } from "./helpers.js";

const profileBody = (user, overrides = {}) => ({
  fName: user.fName,
  lName: user.lName,
  email: user.email,
  username: user.username,
  ...overrides,
});

describe("Feature 4 — User profile API", () => {
  beforeAll(async () => {
    await syncTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-4.2 — Edit profile", () => {
    it("User saves profile changes", async () => {
      const user = await registerUser();
      const previousPassword = (await db.user.unscoped().findByPk(user.user.userId)).password;

      const response = await request(app)
        .put(`/todo/users/${user.user.userId}`)
        .set(user.authHeader)
        .send(
          profileBody(user.user, {
            fName: "Janet",
            lName: "Smith",
            email: "janet@example.com",
            username: "jsmith",
          })
        );

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: user.user.userId,
        fName: "Janet",
        lName: "Smith",
        email: "janet@example.com",
        username: "jsmith",
        role: "worker",
      });
      expect(response.body.password).toBeUndefined();

      const stored = await db.user.unscoped().findByPk(user.user.userId);
      expect(stored.fName).toBe("Janet");
      expect(stored.lName).toBe("Smith");
      expect(stored.email).toBe("janet@example.com");
      expect(stored.username).toBe("jsmith");
      expect(stored.password).toBe(previousPassword);
    });

    it("User fetches their own profile", async () => {
      const user = await registerUser();

      const response = await request(app)
        .get(`/todo/users/${user.user.userId}`)
        .set(user.authHeader);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: user.user.userId,
        fName: user.user.fName,
        lName: user.user.lName,
        email: user.user.email,
        username: user.user.username,
        role: "worker",
      });
      expect(response.body.password).toBeUndefined();
    });

    it("User attempts to fetch another user's profile", async () => {
      const userA = await registerUser({
        email: "a@example.com",
        username: "usera",
      });
      const userB = await registerUser({
        email: "b@example.com",
        username: "userb",
      });

      const response = await request(app)
        .get(`/todo/users/${userB.user.userId}`)
        .set(userA.authHeader);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe(`User with id=${userB.user.userId} not found.`);
      expect(response.body.password).toBeUndefined();
      expect(response.body.email).toBeUndefined();
    });

    it("User attempts to update another user's profile", async () => {
      const userA = await registerUser({
        email: "a@example.com",
        username: "usera",
      });
      const userB = await registerUser({
        email: "b@example.com",
        username: "userb",
        fName: "Bob",
        lName: "Builder",
      });

      const response = await request(app)
        .put(`/todo/users/${userB.user.userId}`)
        .set(userA.authHeader)
        .send(
          profileBody(userB.user, {
            fName: "Hijacked",
            username: "taken",
          })
        );

      expect(response.status).toBe(404);
      expect(response.body.message).toBe(`User with id=${userB.user.userId} not found.`);

      const stored = await db.user.findByPk(userB.user.userId);
      expect(stored.fName).toBe("Bob");
      expect(stored.username).toBe("userb");
      expect(stored.email).toBe("b@example.com");
    });

    it("Unauthenticated profile API request", async () => {
      const response = await request(app).get("/todo/users/1");

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/Unauthorized/i);
    });

    it("Profile update rejects a password that is too short", async () => {
      const user = await registerUser();
      const previous = await db.user.unscoped().findByPk(user.user.userId);

      const response = await request(app)
        .put(`/todo/users/${user.user.userId}`)
        .set(user.authHeader)
        .send({ password: "short" });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Password must be at least 8 characters.");

      const stored = await db.user.unscoped().findByPk(user.user.userId);
      expect(stored.fName).toBe(previous.fName);
      expect(stored.password).toBe(previous.password);
    });

    it("Profile update rejects missing required fields", async () => {
      const user = await registerUser();

      const response = await request(app)
        .put(`/todo/users/${user.user.userId}`)
        .set(user.authHeader)
        .send({
          lName: user.user.lName,
          email: user.user.email,
          username: user.user.username,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("First name is required.");

      const stored = await db.user.findByPk(user.user.userId);
      expect(stored.fName).toBe(user.user.fName);
      expect(stored.email).toBe(user.user.email);
    });

    it("Profile update rejects a duplicate username", async () => {
      const userA = await registerUser({
        email: "a@example.com",
        username: "usera",
      });
      const userB = await registerUser({
        email: "b@example.com",
        username: "userb",
      });

      const response = await request(app)
        .put(`/todo/users/${userA.user.userId}`)
        .set(userA.authHeader)
        .send(profileBody(userA.user, { username: "userb" }));

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Username is already taken.");

      const storedB = await db.user.findByPk(userB.user.userId);
      expect(storedB.username).toBe("userb");

      const storedA = await db.user.findByPk(userA.user.userId);
      expect(storedA.username).toBe("usera");
    });

    it("Profile update rejects a duplicate email", async () => {
      const userA = await registerUser({
        email: "a@example.com",
        username: "usera",
      });
      const userB = await registerUser({
        email: "b@example.com",
        username: "userb",
      });

      const response = await request(app)
        .put(`/todo/users/${userA.user.userId}`)
        .set(userA.authHeader)
        .send(profileBody(userA.user, { email: "b@example.com" }));

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Email is already registered.");

      const storedB = await db.user.findByPk(userB.user.userId);
      expect(storedB.email).toBe("b@example.com");

      const storedA = await db.user.findByPk(userA.user.userId);
      expect(storedA.email).toBe("a@example.com");
    });

    it("Unauthenticated profile update API request", async () => {
      const response = await request(app).put("/todo/users/1").send({
        fName: "Jane",
        lName: "Doe",
        email: "jane@example.com",
        username: "jdoe",
      });

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/Unauthorized/i);
    });
  });
});
