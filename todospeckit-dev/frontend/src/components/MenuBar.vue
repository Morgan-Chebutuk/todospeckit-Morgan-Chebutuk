<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute } from "vue-router";
import Utils from "../config/utils.js";
import { emailRules } from "../config/validation.js";
import authServices from "../services/authServices.js";
import userServices from "../services/userServices.js";

const route = useRoute();
const user = ref(Utils.getStore("user"));
const loggingOut = ref(false);
const menuOpen = ref(false);
const editDialogOpen = ref(false);

const editForm = ref(null);
const fName = ref("");
const lName = ref("");
const email = ref("");
const username = ref("");
const password = ref("");
const confirmPassword = ref("");
const saveLoading = ref(false);
const errorMessage = ref("");

const hiddenOnAuth = computed(() => ["login", "register"].includes(route.name));

const currentUserId = computed(() => user.value?.userId ?? user.value?.id);

const displayName = computed(() => {
  if (!user.value) {
    return "";
  }

  const parts = [user.value.fName, user.value.lName].filter(Boolean);
  return parts.length ? parts.join(" ") : user.value.username ?? "";
});

const fNameRules = [(value) => !!value?.trim() || "First name is required."];
const lNameRules = [(value) => !!value?.trim() || "Last name is required."];
const usernameRules = [(value) => !!value?.trim() || "Username is required."];
const passwordRules = [
  (value) => !value || value.length >= 8 || "Password must be at least 8 characters.",
];
const confirmPasswordRules = [
  (value) => value === password.value || "Passwords do not match.",
];

const refreshUser = () => {
  user.value = Utils.getStore("user");
};

onMounted(() => {
  window.addEventListener("user-logged-in", refreshUser);
  window.addEventListener("user-logged-out", refreshUser);
});

onUnmounted(() => {
  window.removeEventListener("user-logged-in", refreshUser);
  window.removeEventListener("user-logged-out", refreshUser);
});

const fillFromUser = (source) => {
  fName.value = source?.fName ?? "";
  lName.value = source?.lName ?? "";
  email.value = source?.email ?? "";
  username.value = source?.username ?? "";
};

const persistProfile = (profile) => {
  const current = Utils.getStore("user") || {};
  Utils.setStore("user", {
    ...current,
    userId: profile.id ?? current.userId,
    fName: profile.fName,
    lName: profile.lName,
    email: profile.email,
    username: profile.username,
    role: profile.role ?? current.role,
  });
  window.dispatchEvent(new CustomEvent("user-logged-in"));
};

const openEditDialog = async () => {
  menuOpen.value = false;
  errorMessage.value = "";
  password.value = "";
  confirmPassword.value = "";
  fillFromUser(user.value);
  editDialogOpen.value = true;

  if (!currentUserId.value) {
    return;
  }

  try {
    const response = await userServices.getUser(currentUserId.value);
    fillFromUser(response.data);
  } catch (error) {
    errorMessage.value = error.response?.data?.message || "Failed to load profile.";
  }
};

const closeEditDialog = () => {
  editDialogOpen.value = false;
  password.value = "";
  confirmPassword.value = "";
  errorMessage.value = "";
};

const handleSaveProfile = async () => {
  errorMessage.value = "";
  const { valid } = await editForm.value.validate();

  if (!valid || !currentUserId.value) {
    return;
  }

  const payload = {
    fName: fName.value.trim(),
    lName: lName.value.trim(),
    email: email.value.trim(),
    username: username.value.trim(),
  };

  if (password.value) {
    payload.password = password.value;
  }

  saveLoading.value = true;

  try {
    const response = await userServices.updateUser(currentUserId.value, payload);
    persistProfile(response.data);
    closeEditDialog();
  } catch (error) {
    errorMessage.value = error.response?.data?.message || "Failed to update profile.";
  } finally {
    saveLoading.value = false;
  }
};

const handleLogout = async () => {
  menuOpen.value = false;
  loggingOut.value = true;

  try {
    await authServices.logoutUser();
  } finally {
    loggingOut.value = false;
  }
};
</script>

<template>
  <v-app-bar v-if="!hiddenOnAuth && user" color="primary" density="comfortable">
    <v-app-bar-title>Todo</v-app-bar-title>

    <v-spacer />

    <v-menu v-model="menuOpen">
      <template #activator="{ props }">
        <v-btn
          icon="mdi-account-circle"
          variant="text"
          color="on-primary"
          aria-label="Profile"
          v-bind="props"
        />
      </template>

      <v-card min-width="280">
        <v-list>
          <v-list-item :title="displayName">
            <template #subtitle>
              <div>{{ user.username }}</div>
              <div>{{ user.email }}</div>
            </template>
          </v-list-item>
        </v-list>

        <v-card-actions>
          <v-btn
            color="primary"
            variant="elevated"
            class="oc-cta"
            @click="openEditDialog"
          >
            Edit Profile
          </v-btn>
        </v-card-actions>

        <v-list>
          <v-list-item
            title="Log out"
            :disabled="loggingOut"
            @click="handleLogout"
          />
        </v-list>
      </v-card>
    </v-menu>
  </v-app-bar>

  <v-dialog v-if="editDialogOpen" v-model="editDialogOpen" max-width="560">
    <v-card>
      <v-card-title>Edit Profile</v-card-title>
      <v-card-text>
        <v-form ref="editForm" @submit.prevent="handleSaveProfile">
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="fName"
                label="First name"
                autocomplete="given-name"
                :rules="fNameRules"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="lName"
                label="Last name"
                autocomplete="family-name"
                :rules="lNameRules"
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="email"
                label="Email"
                type="email"
                autocomplete="email"
                :rules="emailRules"
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="username"
                label="Username"
                autocomplete="username"
                :rules="usernameRules"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="password"
                label="New password"
                type="password"
                autocomplete="new-password"
                :rules="passwordRules"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="confirmPassword"
                label="Confirm password"
                type="password"
                autocomplete="new-password"
                :rules="confirmPasswordRules"
              />
            </v-col>
          </v-row>
          <v-alert v-if="errorMessage" type="error" class="mt-2">
            {{ errorMessage }}
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
          :loading="saveLoading"
          @click="handleSaveProfile"
        >
          Save
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
