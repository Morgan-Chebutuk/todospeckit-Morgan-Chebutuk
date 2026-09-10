/**
 * Feature 2 — Todo List Management
 * Spec: features/feature-2-todo-list-management.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import Dashboard from "../src/views/Dashboard.vue";
import listServices from "../src/services/listServices.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/listServices.js", () => ({
  default: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

const workList = { id: 1, name: "Work", userId: 1 };
const personalList = { id: 2, name: "Personal", userId: 1 };
const groceriesList = { id: 3, name: "Groceries", userId: 1 };

async function mountDashboard() {
  const { wrapper } = await mountWithPlugins(Dashboard, {
    attachTo: document.body,
  });
  await flushPromises();
  return wrapper;
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

describe("Feature 2 — Dashboard lists view", () => {
  const mountedWrappers = [];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount());
    document.body.innerHTML = "";
  });

  async function mount() {
    const wrapper = await mountDashboard();
    mountedWrappers.push(wrapper);
    return wrapper;
  }

  describe("US-2.2 — View my lists", () => {
    it("User has no lists", async () => {
      listServices.getAll.mockResolvedValue({ data: [] });

      const wrapper = await mount();

      expect(wrapper.text()).toContain("No lists yet. Create your first list.");
    });

    it("Dashboard loads with existing lists", async () => {
      listServices.getAll.mockResolvedValue({ data: [workList, personalList] });

      const wrapper = await mount();

      expect(wrapper.text()).toContain("Work");
      expect(wrapper.text()).toContain("Personal");
      expect(wrapper.findAll('[aria-label="Edit list"]')).toHaveLength(2);
      expect(wrapper.findAll('[aria-label="Delete list"]')).toHaveLength(2);
    });
  });

  describe("US-2.3 — Manage list rows", () => {
    it("List rows show edit and delete actions", async () => {
      listServices.getAll.mockResolvedValue({ data: [groceriesList] });

      const wrapper = await mount();

      expect(wrapper.text()).toContain("Groceries");
      expect(wrapper.find('[aria-label="Edit list"]').exists()).toBe(true);
      expect(wrapper.find('[aria-label="Delete list"]').exists()).toBe(true);
    });
  });

  describe("US-2.1 — Create todo lists", () => {
    it("User creates a new list", async () => {
      listServices.getAll.mockResolvedValue({ data: [] });
      listServices.create.mockResolvedValue({ data: groceriesList });

      const wrapper = await mount();

      await clickButton(wrapper, "+ New List");

      const fields = wrapper.findAllComponents({ name: "VTextField" });
      await fields[0].vm.$emit("update:modelValue", "Groceries");
      await flushPromises();
      await clickButton(wrapper, "Create");

      expect(listServices.create).toHaveBeenCalledWith({ name: "Groceries" });
      expect(wrapper.text()).toContain("Groceries");
    });

    it("User creates a list with an empty name", async () => {
      listServices.getAll.mockResolvedValue({ data: [] });

      const wrapper = await mount();

      await clickButton(wrapper, "+ New List");

      const createForm = wrapper.findAllComponents({ name: "VForm" })[0];
      await clickButton(wrapper, "Create");
      const validation = await createForm.vm.validate();

      expect(validation.valid).toBe(false);
      expect(document.body.textContent).toContain("List name is required.");
      expect(listServices.create).not.toHaveBeenCalled();
    });

    it("User creates a list with a name that is too long", async () => {
      listServices.getAll.mockResolvedValue({ data: [] });
      listServices.create.mockRejectedValue({
        response: { data: { message: "List name must be 100 characters or fewer." } },
      });

      const wrapper = await mount();

      await clickButton(wrapper, "+ New List");

      const fields = wrapper.findAllComponents({ name: "VTextField" });
      await fields[0].vm.$emit("update:modelValue", "a".repeat(101));
      await flushPromises();

      const createForm = wrapper.findAllComponents({ name: "VForm" })[0];
      await clickButton(wrapper, "Create");
      const validation = await createForm.vm.validate();

      expect(validation.valid).toBe(false);
      expect(document.body.textContent).toContain("List name must be 100 characters or fewer.");
      expect(listServices.create).not.toHaveBeenCalled();
    });
  });

  describe("US-2.4 — Rename and delete lists", () => {
    it("User renames a list", async () => {
      listServices.getAll.mockResolvedValue({ data: [groceriesList] });
      listServices.update.mockResolvedValue({
        data: { id: 3, name: "Shopping", userId: 1 },
      });

      const wrapper = await mount();

      await wrapper.get('[aria-label="Edit list"]').trigger("click");
      await flushPromises();

      const renameField = wrapper
        .findAllComponents({ name: "VTextField" })
        .find((field) => field.props("modelValue") === "Groceries");
      await renameField.vm.$emit("update:modelValue", "Shopping");
      await flushPromises();
      await clickButton(wrapper, "Save");

      expect(listServices.update).toHaveBeenCalledWith(3, { name: "Shopping" });
      expect(wrapper.text()).toContain("Shopping");
      expect(wrapper.text()).not.toContain("Groceries");
    });

    it("User deletes a list", async () => {
      listServices.getAll.mockResolvedValue({ data: [groceriesList, personalList] });
      listServices.delete.mockResolvedValue({});

      const wrapper = await mount();
      const deleteButtons = wrapper.findAll('[aria-label="Delete list"]');

      await deleteButtons[0].trigger("click");
      await flushPromises();
      await clickButton(wrapper, "Delete");

      expect(listServices.delete).toHaveBeenCalledWith(3);
      expect(wrapper.text()).not.toContain("Groceries");
      expect(wrapper.text()).toContain("Personal");
    });
  });
});
