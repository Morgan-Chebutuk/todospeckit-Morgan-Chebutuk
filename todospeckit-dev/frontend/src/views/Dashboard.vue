<script setup>
import { onMounted, ref } from "vue";
import listServices from "../services/listServices.js";
import ListItemsDialog from "../components/ListItemsDialog.vue";

const lists = ref([]);
const listsLoading = ref(false);
const listsError = ref("");
const dialogError = ref("");

const createDialogOpen = ref(false);
const renameDialogOpen = ref(false);
const deleteDialogOpen = ref(false);

const createForm = ref(null);
const renameForm = ref(null);

const newListName = ref("");
const renameListName = ref("");
const listToRename = ref(null);
const listToDelete = ref(null);

const createLoading = ref(false);
const renameLoading = ref(false);
const deleteLoading = ref(false);

const itemsDialogOpen = ref(false);
const itemsList = ref(null);

const listNameRules = [
  (value) => !!value?.trim() || "List name is required.",
  (value) => !value || value.trim().length <= 100 || "List name must be 100 characters or fewer.",
];

const loadLists = async () => {
  listsLoading.value = true;
  listsError.value = "";

  try {
    const response = await listServices.getAll();
    lists.value = response.data;
  } catch (error) {
    listsError.value = error.response?.data?.message || "Failed to load lists.";
  } finally {
    listsLoading.value = false;
  }
};

const openCreateDialog = () => {
  dialogError.value = "";
  newListName.value = "";
  createDialogOpen.value = true;
};

const closeCreateDialog = () => {
  createDialogOpen.value = false;
  newListName.value = "";
  dialogError.value = "";
};

const handleCreateList = async () => {
  dialogError.value = "";
  const { valid } = await createForm.value.validate();

  if (!valid) {
    return;
  }

  createLoading.value = true;

  try {
    const response = await listServices.create({ name: newListName.value.trim() });
    lists.value = [...lists.value, response.data].sort((a, b) => a.name.localeCompare(b.name));
    closeCreateDialog();
  } catch (error) {
    dialogError.value = error.response?.data?.message || "Failed to create list.";
  } finally {
    createLoading.value = false;
  }
};

const openRenameDialog = (list) => {
  dialogError.value = "";
  listToRename.value = list;
  renameListName.value = list.name;
  renameDialogOpen.value = true;
};

const closeRenameDialog = () => {
  renameDialogOpen.value = false;
  listToRename.value = null;
  renameListName.value = "";
  dialogError.value = "";
};

const handleRenameList = async () => {
  dialogError.value = "";
  const { valid } = await renameForm.value.validate();

  if (!valid || !listToRename.value) {
    return;
  }

  renameLoading.value = true;

  try {
    const response = await listServices.update(listToRename.value.id, {
      name: renameListName.value.trim(),
    });
    lists.value = lists.value
      .map((list) => (list.id === response.data.id ? response.data : list))
      .sort((a, b) => a.name.localeCompare(b.name));
    closeRenameDialog();
  } catch (error) {
    dialogError.value = error.response?.data?.message || "Failed to rename list.";
  } finally {
    renameLoading.value = false;
  }
};

const openItemsDialog = (list) => {
  itemsList.value = list;
  itemsDialogOpen.value = true;
};

const handleItemsDialogToggle = (open) => {
  itemsDialogOpen.value = open;
  if (!open) {
    itemsList.value = null;
  }
};

const openDeleteDialog = (list) => {
  listsError.value = "";
  listToDelete.value = list;
  deleteDialogOpen.value = true;
};

const closeDeleteDialog = () => {
  deleteDialogOpen.value = false;
  listToDelete.value = null;
};

const handleDeleteList = async () => {
  if (!listToDelete.value) {
    return;
  }

  deleteLoading.value = true;

  try {
    await listServices.delete(listToDelete.value.id);
    lists.value = lists.value.filter((list) => list.id !== listToDelete.value.id);
    closeDeleteDialog();
  } catch (error) {
    listsError.value = error.response?.data?.message || "Failed to delete list.";
    closeDeleteDialog();
  } finally {
    deleteLoading.value = false;
  }
};

onMounted(() => {
  loadLists();
});
</script>

<template>
  <v-container class="py-6">
    <v-alert v-if="listsError" type="error" class="mb-4">
      {{ listsError }}
    </v-alert>

    <v-progress-linear v-if="listsLoading" indeterminate color="primary" class="mb-4" />

    <v-card elevation="2">
      <v-card-item>
        <v-card-title>My Lists</v-card-title>
        <template #append>
          <v-btn
            color="primary"
            variant="elevated"
            class="oc-cta"
            :disabled="listsLoading"
            @click="openCreateDialog"
          >
            + New List
          </v-btn>
        </template>
      </v-card-item>

      <v-card-text>
        <p
          v-if="!listsLoading && lists.length === 0"
          class="text-body-2 text-medium-emphasis"
        >
          No lists yet. Create your first list.
        </p>

        <v-list v-else-if="!listsLoading" density="comfortable" class="pa-0">
          <v-list-item v-for="list in lists" :key="list.id" :title="list.name">
            <template #append>
              <v-btn
                icon="mdi-format-list-checks"
                variant="text"
                size="small"
                :aria-label="`View items for ${list.name}`"
                @click="openItemsDialog(list)"
              />
              <v-btn
                icon="mdi-pencil"
                variant="text"
                size="small"
                aria-label="Edit list"
                @click="openRenameDialog(list)"
              />
              <v-btn
                icon="mdi-delete"
                variant="text"
                size="small"
                aria-label="Delete list"
                @click="openDeleteDialog(list)"
              />
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>

    <v-dialog v-model="createDialogOpen" max-width="480">
      <v-card>
        <v-card-title>New list</v-card-title>
        <v-card-text>
          <v-form ref="createForm" @submit.prevent="handleCreateList">
            <v-text-field
              v-model="newListName"
              label="List name"
              :rules="listNameRules"
              autofocus
            />
            <v-alert v-if="dialogError" type="error" class="mt-2">
              {{ dialogError }}
            </v-alert>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="secondary" variant="text" @click="closeCreateDialog">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            class="oc-cta"
            :loading="createLoading"
            @click="handleCreateList"
          >
            Create
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="renameDialogOpen" max-width="480">
      <v-card>
        <v-card-title>Rename list</v-card-title>
        <v-card-text>
          <v-form ref="renameForm" @submit.prevent="handleRenameList">
            <v-text-field
              v-model="renameListName"
              label="List name"
              :rules="listNameRules"
              autofocus
            />
            <v-alert v-if="dialogError" type="error" class="mt-2">
              {{ dialogError }}
            </v-alert>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="secondary" variant="text" @click="closeRenameDialog">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            class="oc-cta"
            :loading="renameLoading"
            @click="handleRenameList"
          >
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <ListItemsDialog
      v-if="itemsList"
      :model-value="itemsDialogOpen"
      :list="itemsList"
      @update:model-value="handleItemsDialogToggle"
    />

    <v-dialog v-model="deleteDialogOpen" max-width="480">
      <v-card>
        <v-card-title>Delete list</v-card-title>
        <v-card-text>
          Are you sure you want to delete
          <strong>{{ listToDelete?.name }}</strong>?
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="secondary" variant="text" @click="closeDeleteDialog">Cancel</v-btn>
          <v-btn
            color="error"
            variant="elevated"
            class="oc-cta"
            :loading="deleteLoading"
            @click="handleDeleteList"
          >
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
