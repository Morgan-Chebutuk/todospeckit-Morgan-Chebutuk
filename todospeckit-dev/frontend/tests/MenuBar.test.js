/**
 * Feature 4 — User Profile Management
 * Spec: features/feature-4-user-profile-management.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import MenuBar from "../src/components/MenuBar.vue";
import authServices from "../src/services/authServices.js";
import userServices from "../src/services/userServices.js";
import Utils from "../src/config/utils.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/authServices.js", () => ({
  default: {
    loginUser: vi.fn(),
    registerUser: vi.fn(),
    logoutUser: vi.fn(),
  },
}));

vi.mock("../src/services/userServices.js", () => ({
  default: {
    getUser: vi.fn(),
    updateUser: vi.fn(),
  },
}));

const storedUser = {
  userId: 42,
  fName: "Jane",
  lName: "Doe",
  email: "jane@example.com",
  username: "jdoe",
  role: "worker",
  token: "jwt-token",
};

const profile = {
  id: 42,
  fName: "Jane",
  lName: "Doe",
  email: "jane@example.com",
  username: "jdoe",
  role: "worker",
};

function pageText() {
  return document.body.textContent ?? "";
}

function findField(wrapper, label) {
  return wrapper
    .findAllComponents({ name: "VTextField" })
    .find((field) => field.props("label") === label);
}

async function clickButton(wrapper, text) {
  const localButton = wrapper.findAll("button").find((button) => button.text() === text);

  if (localButton) {
    await localButton.trigger("click");
    await flushPromises();
    return;
  }

  const globalButton = [...document.body.querySelectorAll("button")].find(
    (button) => button.textContent?.trim() === text
  );

  expect(globalButton).toBeDefined();
  globalButton.click();
  await flushPromises();
}

describe("Feature 4 — MenuBar profile", () => {
  const mountedWrappers = [];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    Utils.setStore("user", storedUser);
    userServices.getUser.mockResolvedValue({ data: profile });
  });

  afterEach(() => {
    mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount());
    document.body.innerHTML = "";
  });

  async function mount() {
    const { wrapper, router } = await mountWithPlugins(
      {
        components: { MenuBar },
        template: "<v-app><MenuBar /></v-app>",
      },
      {
        attachTo: document.body,
      }
    );
    await flushPromises();
    mountedWrappers.push(wrapper);
    return { wrapper, router };
  }

  async function openProfile(wrapper) {
    await wrapper.get('[aria-label="Profile"]').trigger("click");
    await flushPromises();
  }

  async function openEditDialog(wrapper) {
    await openProfile(wrapper);
    await clickButton(wrapper, "Edit Profile");
  }

  describe("US-4.1 — View profile from the menu bar", () => {
    it("User opens the profile dropdown from the menu bar", async () => {
      const { wrapper } = await mount();
      await openProfile(wrapper);

      expect(pageText()).toContain("Jane Doe");
      expect(pageText()).toContain("jdoe");
      expect(pageText()).toContain("jane@example.com");
      expect(pageText()).toContain("Edit Profile");
      expect(pageText()).toContain("Log out");
    });
  });

  describe("US-4.2 — Edit profile", () => {
    it("User opens the edit profile dialog", async () => {
      const { wrapper } = await mount();
      await openEditDialog(wrapper);

      expect(pageText()).toContain("Edit Profile");
      expect(userServices.getUser).toHaveBeenCalledWith(42);
      expect(findField(wrapper, "First name").props("modelValue")).toBe("Jane");
      expect(findField(wrapper, "Last name").props("modelValue")).toBe("Doe");
      expect(findField(wrapper, "Email").props("modelValue")).toBe("jane@example.com");
      expect(findField(wrapper, "Username").props("modelValue")).toBe("jdoe");
    });

    it("User cancels the edit profile dialog", async () => {
      const { wrapper } = await mount();
      await openEditDialog(wrapper);

      await findField(wrapper, "First name").vm.$emit("update:modelValue", "Janet");
      await flushPromises();
      await clickButton(wrapper, "Cancel");

      expect(userServices.updateUser).not.toHaveBeenCalled();
      expect(Utils.getStore("user")).toEqual(storedUser);
      expect(findField(wrapper, "First name")).toBeUndefined();
    });

    it("User saves profile changes", async () => {
      const updated = {
        ...profile,
        fName: "Janet",
        lName: "Smith",
        email: "janet@example.com",
        username: "jsmith",
      };
      userServices.updateUser.mockResolvedValue({ data: updated });

      const { wrapper } = await mount();
      await openEditDialog(wrapper);

      await findField(wrapper, "First name").vm.$emit("update:modelValue", "Janet");
      await findField(wrapper, "Last name").vm.$emit("update:modelValue", "Smith");
      await findField(wrapper, "Email").vm.$emit("update:modelValue", "janet@example.com");
      await findField(wrapper, "Username").vm.$emit("update:modelValue", "jsmith");
      await flushPromises();
      await clickButton(wrapper, "Save");

      expect(userServices.updateUser).toHaveBeenCalledWith(42, {
        fName: "Janet",
        lName: "Smith",
        email: "janet@example.com",
        username: "jsmith",
      });
      expect(Utils.getStore("user")).toMatchObject({
        userId: 42,
        fName: "Janet",
        lName: "Smith",
        email: "janet@example.com",
        username: "jsmith",
        token: "jwt-token",
      });
      expect(findField(wrapper, "First name")).toBeUndefined();

      await openProfile(wrapper);
      expect(pageText()).toContain("Janet Smith");
      expect(pageText()).toContain("jsmith");
      expect(pageText()).toContain("janet@example.com");
    });

    it("User saves profile with invalid email format", async () => {
      const { wrapper } = await mount();
      await openEditDialog(wrapper);

      await findField(wrapper, "Email").vm.$emit("update:modelValue", "notanemail");
      await flushPromises();

      const form = wrapper.findComponent({ name: "VForm" });
      await clickButton(wrapper, "Save");
      const validation = await form.vm.validate();

      expect(validation.valid).toBe(false);
      expect(pageText()).toContain("Enter a valid email address.");
      expect(userServices.updateUser).not.toHaveBeenCalled();
    });

    it("User saves profile with mismatched passwords", async () => {
      const { wrapper } = await mount();
      await openEditDialog(wrapper);

      await findField(wrapper, "New password").vm.$emit("update:modelValue", "newpassword123");
      await findField(wrapper, "Confirm password").vm.$emit("update:modelValue", "otherpassword");
      await flushPromises();

      const form = wrapper.findComponent({ name: "VForm" });
      await clickButton(wrapper, "Save");
      const validation = await form.vm.validate();

      expect(validation.valid).toBe(false);
      expect(pageText()).toContain("Passwords do not match.");
      expect(userServices.updateUser).not.toHaveBeenCalled();
    });

    it("User saves profile with a password that is too short", async () => {
      const { wrapper } = await mount();
      await openEditDialog(wrapper);

      await findField(wrapper, "New password").vm.$emit("update:modelValue", "short");
      await findField(wrapper, "Confirm password").vm.$emit("update:modelValue", "short");
      await flushPromises();

      const form = wrapper.findComponent({ name: "VForm" });
      await clickButton(wrapper, "Save");
      const validation = await form.vm.validate();

      expect(validation.valid).toBe(false);
      expect(pageText()).toContain("Password must be at least 8 characters.");
      expect(userServices.updateUser).not.toHaveBeenCalled();
    });

    it("Profile update API returns an error", async () => {
      userServices.updateUser.mockRejectedValue({
        response: { data: { message: "Username is already taken." } },
      });

      const { wrapper } = await mount();
      await openEditDialog(wrapper);
      await clickButton(wrapper, "Save");

      expect(pageText()).toContain("Username is already taken.");
      expect(wrapper.findComponent({ name: "VAlert" }).exists()).toBe(true);
      expect(pageText()).toContain("Edit Profile");
      expect(findField(wrapper, "First name")).toBeDefined();
    });
  });

  describe("US-4.3 — Log out from profile", () => {
    it("User logs out from the profile dropdown", async () => {
      const { wrapper, router } = await mount();
      authServices.logoutUser.mockImplementation(async () => {
        Utils.removeItem("user");
        window.dispatchEvent(new CustomEvent("user-logged-out"));
        await router.push({ name: "login" });
      });

      await openProfile(wrapper);

      const logoutItem = wrapper
        .findAllComponents({ name: "VListItem" })
        .find((item) => item.props("title") === "Log out");
      await logoutItem.trigger("click");
      await flushPromises();

      expect(authServices.logoutUser).toHaveBeenCalledTimes(1);
      expect(Utils.getStore("user")).toBeNull();
      expect(router.currentRoute.value.name).toBe("login");
    });
  });

  describe("US-4.4 — Single logout entry point", () => {
    it("Menu bar does not show Sign out", async () => {
      const { wrapper } = await mount();

      expect(wrapper.text()).not.toContain("Sign out");
      expect(pageText()).not.toContain("Sign out");
    });
  });
});
