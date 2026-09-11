/**
 * Feature 2 — Todo List Management
 * Spec: features/feature-2-todo-list-management.md
 *
 * Feature 3 — Todo List Item Management
 * Spec: features/feature-3-todo-list-item-management.md
 *
 * Feature 5 — Todo Due Date
 * Spec: features/feature-5-todo-due-date.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import Dashboard from "../src/views/Dashboard.vue";
import listServices from "../src/services/listServices.js";
import todoServices from "../src/services/todoServices.js";
import { formatDueDate } from "../src/config/validation.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/listServices.js", () => ({
  default: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("../src/services/todoServices.js", () => ({
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

const buyMilk = {
  id: 10,
  listId: 3,
  title: "Buy milk",
  completed: false,
  userId: 1,
  createdAt: "2026-07-02T12:05:00.000Z",
};

const emailClient = {
  id: 11,
  listId: 1,
  title: "Email client",
  completed: false,
  userId: 1,
  createdAt: "2026-07-02T12:01:00.000Z",
};

const writeReport = {
  id: 12,
  listId: 1,
  title: "Write report",
  completed: false,
  userId: 1,
  createdAt: "2026-07-02T12:02:00.000Z",
};

const callMom = {
  id: 13,
  listId: 2,
  title: "Call mom",
  completed: false,
  userId: 1,
  createdAt: "2026-07-02T12:03:00.000Z",
};

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

async function openItems(wrapper, listName) {
  await wrapper.get(`[aria-label="View items for ${listName}"]`).trigger("click");
  await flushPromises();
}

function findTodoTitleField(wrapper) {
  return wrapper
    .findAllComponents({ name: "VTextField" })
    .find((field) => field.props("label") === "Todo title");
}

function findDueDateField(wrapper) {
  return wrapper
    .findAllComponents({ name: "VTextField" })
    .find((field) => field.props("label") === "Due date");
}

function findDueDateSubtitle(wrapper, formattedDate) {
  return wrapper
    .findAllComponents({ name: "VListItemSubtitle" })
    .find((item) => item.text() === formattedDate);
}

function yesterdayDateOnly() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - 1);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function pageText() {
  return document.body.textContent ?? "";
}

async function clickAriaButton(ariaLabel) {
  const button = [...document.body.querySelectorAll("button")].find(
    (element) => element.getAttribute("aria-label") === ariaLabel
  );

  expect(button).toBeDefined();
  button.click();
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

describe("Feature 3 — Dashboard todo items", () => {
  const mountedWrappers = [];

  beforeEach(() => {
    vi.clearAllMocks();
    todoServices.getAll.mockResolvedValue({ data: [] });
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

  describe("US-3.1 — Add tasks to a list", () => {
    it("User adds a todo to a list via dialog", async () => {
      listServices.getAll.mockResolvedValue({ data: [groceriesList] });
      todoServices.create.mockResolvedValue({
        data: { ...buyMilk, completed: false },
      });

      const wrapper = await mount();
      await openItems(wrapper, "Groceries");
      await clickButton(wrapper, "+ Add Item");

      const titleField = findTodoTitleField(wrapper);
      await titleField.vm.$emit("update:modelValue", "Buy milk");
      await flushPromises();
      await clickButton(wrapper, "Add");

      expect(todoServices.create).toHaveBeenCalledWith(3, { title: "Buy milk" });
      expect(pageText()).toContain("Buy milk");
      expect(pageText()).toContain("Groceries — Items");
    });

    it("User adds a todo with an empty title", async () => {
      listServices.getAll.mockResolvedValue({ data: [groceriesList] });

      const wrapper = await mount();
      await openItems(wrapper, "Groceries");
      await clickButton(wrapper, "+ Add Item");

      const addForm = wrapper.findAllComponents({ name: "VForm" }).at(-1);
      await clickButton(wrapper, "Add");
      const validation = await addForm.vm.validate();

      expect(validation.valid).toBe(false);
      expect(pageText()).toContain("Todo title is required.");
      expect(todoServices.create).not.toHaveBeenCalled();
    });

    it("Add item is only available inside the items dialog", async () => {
      listServices.getAll.mockResolvedValue({ data: [groceriesList] });

      const wrapper = await mount();

      expect(pageText()).not.toContain("+ Add Item");
      expect(findTodoTitleField(wrapper)).toBeUndefined();
      expect(wrapper.find('[aria-label="View items for Groceries"]').exists()).toBe(true);
    });
  });

  describe("US-3.2 — View tasks in a list", () => {
    it("List items dialog shows empty state", async () => {
      listServices.getAll.mockResolvedValue({ data: [personalList] });

      const wrapper = await mount();
      await openItems(wrapper, "Personal");

      expect(todoServices.getAll).toHaveBeenCalledWith(2);
      expect(pageText()).toContain("Personal — Items");
      expect(pageText()).toContain("No todos in this list yet.");
    });

    it("User opens items for different lists", async () => {
      listServices.getAll.mockResolvedValue({ data: [workList, personalList] });
      todoServices.getAll.mockImplementation((listId) => {
        if (listId === workList.id) {
          return Promise.resolve({ data: [emailClient, writeReport] });
        }

        if (listId === personalList.id) {
          return Promise.resolve({ data: [callMom] });
        }

        return Promise.resolve({ data: [] });
      });

      const wrapper = await mount();
      await openItems(wrapper, "Personal");

      expect(todoServices.getAll).toHaveBeenCalledWith(personalList.id);
      expect(pageText()).toContain("Call mom");
      expect(pageText()).not.toContain("Email client");
      expect(pageText()).not.toContain("Write report");

      await clickButton(wrapper, "Close");
      await openItems(wrapper, "Work");

      expect(todoServices.getAll).toHaveBeenCalledWith(workList.id);
      expect(pageText()).toContain("Email client");
      expect(pageText()).toContain("Write report");
      expect(pageText()).not.toContain("Call mom");
    });
  });

  describe("US-3.3 — Complete tasks", () => {
    it("User marks a todo as complete", async () => {
      listServices.getAll.mockResolvedValue({ data: [groceriesList] });
      todoServices.getAll.mockResolvedValue({ data: [buyMilk] });
      todoServices.update.mockResolvedValue({
        data: { ...buyMilk, completed: true },
      });

      const wrapper = await mount();
      await openItems(wrapper, "Groceries");

      const checkbox = wrapper.findAllComponents({ name: "VCheckbox" })[0];
      await checkbox.vm.$emit("update:modelValue", true);
      await flushPromises();

      expect(todoServices.update).toHaveBeenCalledWith(10, { completed: true });

      const title = wrapper
        .findAllComponents({ name: "VListItemTitle" })
        .find((item) => item.text() === "Buy milk");
      expect(title.classes()).toEqual(
        expect.arrayContaining(["text-decoration-line-through", "text-medium-emphasis"])
      );
    });

    it("User marks a completed todo as incomplete", async () => {
      const completedMilk = { ...buyMilk, completed: true };
      listServices.getAll.mockResolvedValue({ data: [groceriesList] });
      todoServices.getAll.mockResolvedValue({ data: [completedMilk] });
      todoServices.update.mockResolvedValue({
        data: { ...completedMilk, completed: false },
      });

      const wrapper = await mount();
      await openItems(wrapper, "Groceries");

      const checkbox = wrapper.findAllComponents({ name: "VCheckbox" })[0];
      await checkbox.vm.$emit("update:modelValue", false);
      await flushPromises();

      expect(todoServices.update).toHaveBeenCalledWith(10, { completed: false });

      const title = wrapper
        .findAllComponents({ name: "VListItemTitle" })
        .find((item) => item.text() === "Buy milk");
      expect(title.classes()).not.toContain("text-decoration-line-through");
    });
  });

  describe("US-3.4 — Edit and remove tasks", () => {
    it("User edits a todo title", async () => {
      listServices.getAll.mockResolvedValue({ data: [groceriesList] });
      todoServices.getAll.mockResolvedValue({ data: [buyMilk] });
      todoServices.update.mockResolvedValue({
        data: { ...buyMilk, title: "Buy oat milk" },
      });

      const wrapper = await mount();
      await openItems(wrapper, "Groceries");
      await clickAriaButton("Edit item");

      const editField = wrapper
        .findAllComponents({ name: "VTextField" })
        .find((field) => field.props("modelValue") === "Buy milk");
      await editField.vm.$emit("update:modelValue", "Buy oat milk");
      await flushPromises();
      await clickButton(wrapper, "Save");

      expect(todoServices.update).toHaveBeenCalledWith(10, { title: "Buy oat milk" });
      expect(pageText()).toContain("Buy oat milk");
      expect(pageText()).not.toContain("Buy milk");
    });

    it("User deletes a todo", async () => {
      listServices.getAll.mockResolvedValue({ data: [groceriesList] });
      todoServices.getAll.mockResolvedValue({ data: [buyMilk] });
      todoServices.delete.mockResolvedValue({});

      const wrapper = await mount();
      await openItems(wrapper, "Groceries");
      await clickAriaButton("Delete item");
      await clickButton(wrapper, "Delete");

      expect(todoServices.delete).toHaveBeenCalledWith(10);
      expect(pageText()).not.toContain("Buy milk");
      expect(pageText()).toContain("No todos in this list yet.");
    });
  });
});

describe("Feature 5 — Dashboard todo due dates", () => {
  const mountedWrappers = [];

  beforeEach(() => {
    vi.clearAllMocks();
    todoServices.getAll.mockResolvedValue({ data: [] });
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

  describe("US-5.1 — Set a due date when creating a todo", () => {
    it("User adds a todo with a due date", async () => {
      const created = { ...buyMilk, dueDate: "2026-07-15" };
      listServices.getAll.mockResolvedValue({ data: [groceriesList] });
      todoServices.create.mockResolvedValue({ data: created });

      const wrapper = await mount();
      await openItems(wrapper, "Groceries");
      await clickButton(wrapper, "+ Add Item");

      const titleField = findTodoTitleField(wrapper);
      const dueDateField = findDueDateField(wrapper);
      await titleField.vm.$emit("update:modelValue", "Buy milk");
      await dueDateField.vm.$emit("update:modelValue", "2026-07-15");
      await flushPromises();
      await clickButton(wrapper, "Add");

      expect(todoServices.create).toHaveBeenCalledWith(3, {
        title: "Buy milk",
        dueDate: "2026-07-15",
      });
      expect(pageText()).toContain("Buy milk");
      expect(pageText()).toContain(formatDueDate("2026-07-15"));
    });

    it("User adds a todo without a due date", async () => {
      listServices.getAll.mockResolvedValue({ data: [groceriesList] });
      todoServices.create.mockResolvedValue({
        data: { ...buyMilk, dueDate: null },
      });

      const wrapper = await mount();
      await openItems(wrapper, "Groceries");
      await clickButton(wrapper, "+ Add Item");

      const titleField = findTodoTitleField(wrapper);
      await titleField.vm.$emit("update:modelValue", "Buy milk");
      await flushPromises();
      await clickButton(wrapper, "Add");

      expect(todoServices.create).toHaveBeenCalledWith(3, { title: "Buy milk" });
      expect(pageText()).toContain("Buy milk");
      expect(findDueDateSubtitle(wrapper, formatDueDate("2026-07-15"))).toBeUndefined();
      expect(wrapper.findAllComponents({ name: "VListItemSubtitle" })).toHaveLength(0);
    });
  });

  describe("US-5.3 — Edit or clear a due date", () => {
    it("User sets a due date when editing a todo", async () => {
      listServices.getAll.mockResolvedValue({ data: [groceriesList] });
      todoServices.getAll.mockResolvedValue({
        data: [{ ...buyMilk, dueDate: null }],
      });
      todoServices.update.mockResolvedValue({
        data: { ...buyMilk, dueDate: "2026-07-20" },
      });

      const wrapper = await mount();
      await openItems(wrapper, "Groceries");
      await clickAriaButton("Edit item");

      const dueDateField = findDueDateField(wrapper);
      expect(dueDateField.props("modelValue")).toBe("");
      await dueDateField.vm.$emit("update:modelValue", "2026-07-20");
      await flushPromises();
      await clickButton(wrapper, "Save");

      expect(todoServices.update).toHaveBeenCalledWith(10, {
        title: "Buy milk",
        dueDate: "2026-07-20",
      });
      expect(pageText()).toContain(formatDueDate("2026-07-20"));
    });

    it("User clears a due date when editing a todo", async () => {
      const withDueDate = { ...buyMilk, dueDate: "2026-07-20" };
      listServices.getAll.mockResolvedValue({ data: [groceriesList] });
      todoServices.getAll.mockResolvedValue({ data: [withDueDate] });
      todoServices.update.mockResolvedValue({
        data: { ...buyMilk, dueDate: null },
      });

      const wrapper = await mount();
      await openItems(wrapper, "Groceries");
      expect(pageText()).toContain(formatDueDate("2026-07-20"));

      await clickAriaButton("Edit item");

      const dueDateField = findDueDateField(wrapper);
      expect(dueDateField.props("modelValue")).toBe("2026-07-20");
      await dueDateField.vm.$emit("update:modelValue", "");
      await flushPromises();
      await clickButton(wrapper, "Save");

      expect(todoServices.update).toHaveBeenCalledWith(10, {
        title: "Buy milk",
        dueDate: null,
      });
      expect(pageText()).not.toContain(formatDueDate("2026-07-20"));
      expect(wrapper.findAllComponents({ name: "VListItemSubtitle" })).toHaveLength(0);
    });
  });

  describe("US-5.4 — Spot overdue todos", () => {
    it("Incomplete todo past due date is styled as overdue", async () => {
      const yesterday = yesterdayDateOnly();
      const overdueTodo = {
        ...buyMilk,
        dueDate: yesterday,
        completed: false,
      };
      listServices.getAll.mockResolvedValue({ data: [groceriesList] });
      todoServices.getAll.mockResolvedValue({ data: [overdueTodo] });

      const wrapper = await mount();
      await openItems(wrapper, "Groceries");

      const subtitle = findDueDateSubtitle(wrapper, formatDueDate(yesterday));
      expect(subtitle).toBeDefined();
      expect(subtitle.classes()).toContain("text-error");
    });

    it("Completed todo past due date is not styled as overdue", async () => {
      const yesterday = yesterdayDateOnly();
      const completedOverdue = {
        ...buyMilk,
        dueDate: yesterday,
        completed: true,
      };
      listServices.getAll.mockResolvedValue({ data: [groceriesList] });
      todoServices.getAll.mockResolvedValue({ data: [completedOverdue] });

      const wrapper = await mount();
      await openItems(wrapper, "Groceries");

      const subtitle = findDueDateSubtitle(wrapper, formatDueDate(yesterday));
      expect(subtitle).toBeDefined();
      expect(subtitle.classes()).not.toContain("text-error");
    });
  });
});
