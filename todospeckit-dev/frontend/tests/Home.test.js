/**
 * Feature 1 — User Authentication & Session Management
 * Spec: features/feature-1-user-auth.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import Home from "../src/views/Home.vue";
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

describe("Feature 1 — Home", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("US-1.4 — Sign out", () => {
    it("User signs out", async () => {
      Utils.setStore("user", {
        userId: 1,
        fName: "Jane",
        username: "jdoe",
        token: "jwt-token",
      });

      const { wrapper } = await mountWithPlugins(Home, {
        router: await createTestRouter("/"),
      });

      expect(wrapper.text()).toContain("Welcome, Jane");

      const signOut = wrapper.findAllComponents({ name: "VBtn" }).find((button) => {
        return button.text().includes("Sign out");
      });

      expect(signOut).toBeDefined();
      await signOut.trigger("click");
      await flushPromises();

      expect(authServices.logoutUser).toHaveBeenCalledTimes(1);
    });
  });
});
