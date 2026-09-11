<script setup>
import { ref, watch } from "vue";
import todoServices from "../services/todoServices.js";

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
  list: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["update:modelValue"]);

const todos = ref([]);
const todosLoading = ref(false);
const todosError = ref("");
const dialogError = ref("");

const addDialogOpen = ref(false);
const editDialogOpen = ref(false);
const deleteDialogOpen = ref(false);

const addForm = ref(null);
const editForm = ref(null);

const newTodoTitle = ref("");
const editTodoTitle = ref("");
const todoToEdit = ref(null);
const todoToDelete = ref(null);

const addLoading = ref(false);
const editLoading = ref(false);
const deleteLoading = ref(false);
const toggleLoadingId = ref(null);

const todoTitleRules = [
  (value) => !!value?.trim() || "Todo title is required.",
  (value) => !value || value.trim().length <= 255 || "Todo title must be 255 characters or fewer.",
];

const sortTodos = (items) =>
  [...items].sort((a, b) => {
    if (Boolean(a.completed) !== Boolean(b.completed)) {
      return Boolean(a.completed) ? 1 : -1;
    }

    return new Date(a.createdAt) - new Date(b.createdAt);
  });

const loadTodos = async () => {
  todosLoading.value = true;
  todosError.value = "";

  try {
    const response = await todoServices.getAll(props.list.id);
    todos.value = response.data;
  } catch (error) {
    todosError.value = error.response?.data?.message || "Failed to load todos.";
    todos.value = [];
  } finally {
    todosLoading.value = false;
  }
};

watch(
  () => [props.modelValue, props.list?.id],
  ([isOpen]) => {
    if (isOpen) {
      loadTodos();
    }
  },
  { immediate: true }
);

const closeItemsDialog = () => {
  emit("update:modelValue", false);
};

const openAddDialog = () => {
  dialogError.value = "";
  newTodoTitle.value = "";
  addDialogOpen.value = true;
};

const closeAddDialog = () => {
  addDialogOpen.value = false;
  newTodoTitle.value = "";
  dialogError.value = "";
};

const handleAddTodo = async () => {
  dialogError.value = "";
  const { valid } = await addForm.value.validate();

  if (!valid) {
    return;
  }

  addLoading.value = true;

  try {
    const response = await todoServices.create(props.list.id, {
      title: newTodoTitle.value.trim(),
    });
    todos.value = sortTodos([...todos.value, response.data]);
    closeAddDialog();
  } catch (error) {
    dialogError.value = error.response?.data?.message || "Failed to create todo.";
  } finally {
    addLoading.value = false;
  }
};

const openEditDialog = (todo) => {
  dialogError.value = "";
  todoToEdit.value = todo;
  editTodoTitle.value = todo.title;
  editDialogOpen.value = true;
};

const closeEditDialog = () => {
  editDialogOpen.value = false;
  todoToEdit.value = null;
  editTodoTitle.value = "";
  dialogError.value = "";
};

const handleEditTodo = async () => {
  dialogError.value = "";
  const { valid } = await editForm.value.validate();

  if (!valid || !todoToEdit.value) {
    return;
  }

  editLoading.value = true;

  try {
    const response = await todoServices.update(todoToEdit.value.id, {
      title: editTodoTitle.value.trim(),
    });
    todos.value = sortTodos(
      todos.value.map((todo) => (todo.id === response.data.id ? response.data : todo))
    );
    closeEditDialog();
  } catch (error) {
    dialogError.value = error.response?.data?.message || "Failed to update todo.";
  } finally {
    editLoading.value = false;
  }
};

const openDeleteDialog = (todo) => {
  todosError.value = "";
  todoToDelete.value = todo;
  deleteDialogOpen.value = true;
};

const closeDeleteDialog = () => {
  deleteDialogOpen.value = false;
  todoToDelete.value = null;
};

const handleDeleteTodo = async () => {
  if (!todoToDelete.value) {
    return;
  }

  deleteLoading.value = true;

  try {
    await todoServices.delete(todoToDelete.value.id);
    todos.value = todos.value.filter((todo) => todo.id !== todoToDelete.value.id);
    closeDeleteDialog();
  } catch (error) {
    todosError.value = error.response?.data?.message || "Failed to delete todo.";
    closeDeleteDialog();
  } finally {
    deleteLoading.value = false;
  }
};

const handleToggleComplete = async (todo, completed) => {
  todosError.value = "";
  toggleLoadingId.value = todo.id;

  try {
    const response = await todoServices.update(todo.id, { completed: Boolean(completed) });
    todos.value = sortTodos(
      todos.value.map((item) => (item.id === response.data.id ? response.data : item))
    );
  } catch (error) {
    todosError.value = error.response?.data?.message || "Failed to update todo.";
  } finally {
    toggleLoadingId.value = null;
  }
};
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    :persistent="addDialogOpen || editDialogOpen || deleteDialogOpen"
    max-width="560"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-item>
        <v-card-title>{{ list.name }} — Items</v-card-title>
        <template #append>
          <v-btn
            color="primary"
            variant="elevated"
            class="oc-cta"
            :disabled="todosLoading"
            @click="openAddDialog"
          >
            + Add Item
          </v-btn>
        </template>
      </v-card-item>

      <v-card-text>
        <v-alert v-if="todosError" type="error" class="mb-4">
          {{ todosError }}
        </v-alert>

        <v-progress-linear v-if="todosLoading" indeterminate color="primary" class="mb-4" />

        <p
          v-if="!todosLoading && todos.length === 0"
          class="text-body-2 text-medium-emphasis"
        >
          No todos in this list yet.
        </p>

        <v-list v-else-if="!todosLoading" density="comfortable" class="pa-0">
          <v-list-item v-for="todo in todos" :key="todo.id">
            <template #prepend>
              <v-checkbox
                :model-value="Boolean(todo.completed)"
                hide-details
                density="compact"
                color="primary"
                :disabled="toggleLoadingId === todo.id"
                :aria-label="`Mark ${todo.title} ${todo.completed ? 'incomplete' : 'complete'}`"
                @update:model-value="handleToggleComplete(todo, $event)"
                @click.stop
              />
            </template>

            <v-list-item-title
              :class="todo.completed ? 'text-decoration-line-through text-medium-emphasis' : ''"
            >
              {{ todo.title }}
            </v-list-item-title>

            <template #append>
              <v-btn
                icon="mdi-pencil"
                variant="text"
                size="small"
                aria-label="Edit item"
                @click="openEditDialog(todo)"
              />
              <v-btn
                icon="mdi-delete"
                variant="text"
                size="small"
                aria-label="Delete item"
                @click="openDeleteDialog(todo)"
              />
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn color="secondary" variant="text" @click="closeItemsDialog">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-if="addDialogOpen" v-model="addDialogOpen" max-width="480">
    <v-card>
      <v-card-title>Add item</v-card-title>
      <v-card-text>
        <v-form ref="addForm" @submit.prevent="handleAddTodo">
          <v-text-field
            v-model="newTodoTitle"
            label="Todo title"
            :rules="todoTitleRules"
            autofocus
          />
          <v-alert v-if="dialogError" type="error" class="mt-2">
            {{ dialogError }}
          </v-alert>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="secondary" variant="text" @click="closeAddDialog">Cancel</v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          class="oc-cta"
          :loading="addLoading"
          @click="handleAddTodo"
        >
          Add
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-if="editDialogOpen" v-model="editDialogOpen" max-width="480">
    <v-card>
      <v-card-title>Edit item</v-card-title>
      <v-card-text>
        <v-form ref="editForm" @submit.prevent="handleEditTodo">
          <v-text-field
            v-model="editTodoTitle"
            label="Todo title"
            :rules="todoTitleRules"
            autofocus
          />
          <v-alert v-if="dialogError" type="error" class="mt-2">
            {{ dialogError }}
          </v-alert>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="secondary" variant="text" @click="closeEditDialog">Cancel</v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          class="oc-cta"
          :loading="editLoading"
          @click="handleEditTodo"
        >
          Save
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-if="deleteDialogOpen" v-model="deleteDialogOpen" max-width="480">
    <v-card>
      <v-card-title>Delete item</v-card-title>
      <v-card-text>
        Are you sure you want to delete
        <strong>{{ todoToDelete?.title }}</strong>?
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="secondary" variant="text" @click="closeDeleteDialog">Cancel</v-btn>
        <v-btn
          color="error"
          variant="elevated"
          class="oc-cta"
          :loading="deleteLoading"
          @click="handleDeleteTodo"
        >
          Delete
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
