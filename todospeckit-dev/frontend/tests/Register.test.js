/**
 * Feature 1 — User Authentication & Session Management
 * Spec: features/feature-1-user-auth.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import Register from "../src/views/Register.vue";
import authServices from "../src/services/authServices.js";
import Utils from "../src/config/utils.js";
import { mountWithPlugins, createTestRouter } from "./testUtils.js";

vi.mock("../src/services/authServices.js", () => ({
  default: {
    loginUser: vi.fn(),
    registerUser: vi.fn(),
    logoutUser: vi.fn(),
  },
}));

async function getForm(wrapper) {
  return wrapper.findComponent({ name: "VForm" });
}

async function getTextFields(wrapper) {
  return wrapper.findAllComponents({ name: "VTextField" });
}

async function fillValidRegisterForm(wrapper, overrides = {}) {
  const values = {
    fName: "Jane",
    lName: "Doe",
    email: "jane@example.com",
    username: "jdoe",
    password: "password123",
    confirmPassword: "password123",
    ...overrides,
  };

  const fields = await getTextFields(wrapper);
  await fields[0].setValue(values.fName);
  await fields[1].setValue(values.lName);
  await fields[2].setValue(values.email);
  await fields[3].setValue(values.username);
  await fields[4].setValue(values.password);
  await fields[5].setValue(values.confirmPassword);
}

async function submitRegisterForm(wrapper) {
  await wrapper.find('button[type="submit"]').trigger("click");
  await flushPromises();
}

async function fillRegisterFieldsByEmit(wrapper, values) {
  const fields = await getTextFields(wrapper);
  await fields[0].vm.$emit("update:modelValue", values.fName);
  await fields[1].vm.$emit("update:modelValue", values.lName);
  await fields[2].vm.$emit("update:modelValue", values.email);
  await fields[3].vm.$emit("update:modelValue", values.username);
  await fields[4].vm.$emit("update:modelValue", values.password);
  await fields[5].vm.$emit("update:modelValue", values.confirmPassword);
  await flushPromises();
}

describe("Feature 1 — Register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("US-1.1 — Registration", () => {
    it("User registers with valid information", async () => {
      const payload = {
        userId: 1,
        username: "jdoe",
        email: "jane@example.com",
        fName: "Jane",
        lName: "Doe",
        role: "worker",
        token: "jwt-token",
      };
      authServices.registerUser.mockResolvedValue({ data: payload });

      const { wrapper, router } = await mountWithPlugins(Register, {
        router: await createTestRouter("/register"),
      });

      await fillRegisterFieldsByEmit(wrapper, {
        fName: "Jane",
        lName: "Doe",
        email: "jane@example.com",
        username: "jdoe",
        password: "password123",
        confirmPassword: "password123",
      });
      await wrapper.findComponent({ name: "VForm" }).trigger("submit");
      await flushPromises();

      expect(authServices.registerUser).toHaveBeenCalledWith({
        fName: "Jane",
        lName: "Doe",
        email: "jane@example.com",
        username: "jdoe",
        password: "password123",
      });
      expect(Utils.getStore("user")).toMatchObject(payload);
      expect(router.currentRoute.value.name).toBe("home");
    });

    it("User submits registration with missing email", async () => {
      const { wrapper } = await mountWithPlugins(Register, {
        router: await createTestRouter("/register"),
      });
      const form = await getForm(wrapper);

      await fillValidRegisterForm(wrapper, { email: "" });
      await submitRegisterForm(wrapper);
      const validation = await form.vm.validate();

      expect(validation.valid).toBe(false);
      expect(wrapper.text()).toContain("Email is required.");
      expect(authServices.registerUser).not.toHaveBeenCalled();
    });

    it("User submits registration with invalid email format", async () => {
      const { wrapper } = await mountWithPlugins(Register, {
        router: await createTestRouter("/register"),
      });
      const form = await getForm(wrapper);

      await fillValidRegisterForm(wrapper, { email: "notanemail" });
      await submitRegisterForm(wrapper);
      const validation = await form.vm.validate();

      expect(validation.valid).toBe(false);
      expect(wrapper.text()).toContain("Enter a valid email address.");
      expect(authServices.registerUser).not.toHaveBeenCalled();
    });

    it("User submits registration with missing username", async () => {
      const { wrapper } = await mountWithPlugins(Register, {
        router: await createTestRouter("/register"),
      });
      const form = await getForm(wrapper);

      await fillValidRegisterForm(wrapper, { username: "" });
      await submitRegisterForm(wrapper);
      const validation = await form.vm.validate();

      expect(validation.valid).toBe(false);
      expect(wrapper.text()).toContain("Username is required.");
      expect(authServices.registerUser).not.toHaveBeenCalled();
    });

    it("User submits registration with password too short", async () => {
      const { wrapper } = await mountWithPlugins(Register, {
        router: await createTestRouter("/register"),
      });
      const form = await getForm(wrapper);

      await fillValidRegisterForm(wrapper, {
        password: "short",
        confirmPassword: "short",
      });
      await submitRegisterForm(wrapper);
      const validation = await form.vm.validate();

      expect(validation.valid).toBe(false);
      expect(wrapper.text()).toContain("Password must be at least 8 characters.");
      expect(authServices.registerUser).not.toHaveBeenCalled();
    });

    it("User registers with a duplicate username", async () => {
      authServices.registerUser.mockRejectedValue({
        response: { data: { message: "Username is already taken." } },
      });

      const { wrapper } = await mountWithPlugins(Register, {
        router: await createTestRouter("/register"),
      });
      const fields = await getTextFields(wrapper);

      await fields[0].vm.$emit("update:modelValue", "Jane");
      await fields[1].vm.$emit("update:modelValue", "Doe");
      await fields[2].vm.$emit("update:modelValue", "jane@example.com");
      await fields[3].vm.$emit("update:modelValue", "jdoe");
      await fields[4].vm.$emit("update:modelValue", "password123");
      await fields[5].vm.$emit("update:modelValue", "password123");
      await flushPromises();
      await wrapper.findComponent({ name: "VForm" }).trigger("submit");
      await flushPromises();

      expect(authServices.registerUser).toHaveBeenCalled();
      expect(wrapper.text()).toContain("Username is already taken.");
      expect(wrapper.find(".v-alert").exists()).toBe(true);
    });

    it("User registers with a duplicate email", async () => {
      authServices.registerUser.mockRejectedValue({
        response: { data: { message: "Email is already registered." } },
      });

      const { wrapper } = await mountWithPlugins(Register, {
        router: await createTestRouter("/register"),
      });
      const fields = await getTextFields(wrapper);

      await fields[0].vm.$emit("update:modelValue", "Jane");
      await fields[1].vm.$emit("update:modelValue", "Doe");
      await fields[2].vm.$emit("update:modelValue", "jane@example.com");
      await fields[3].vm.$emit("update:modelValue", "jdoe");
      await fields[4].vm.$emit("update:modelValue", "password123");
      await fields[5].vm.$emit("update:modelValue", "password123");
      await flushPromises();
      await wrapper.findComponent({ name: "VForm" }).trigger("submit");
      await flushPromises();

      expect(authServices.registerUser).toHaveBeenCalled();
      expect(wrapper.text()).toContain("Email is already registered.");
      expect(wrapper.find(".v-alert").exists()).toBe(true);
    });

    it("User submits registration with mismatched passwords", async () => {
      const { wrapper } = await mountWithPlugins(Register, {
        router: await createTestRouter("/register"),
      });
      const form = await getForm(wrapper);

      await fillValidRegisterForm(wrapper, { confirmPassword: "differentpassword" });
      await submitRegisterForm(wrapper);
      const validation = await form.vm.validate();

      expect(validation.valid).toBe(false);
      expect(wrapper.text()).toContain("Passwords do not match.");
      expect(authServices.registerUser).not.toHaveBeenCalled();
    });
  });
});
