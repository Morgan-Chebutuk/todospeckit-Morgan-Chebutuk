<script setup>
import { computed, ref } from "vue";
import authServices from "../services/authServices.js";
import Utils from "../config/utils.js";

const user = computed(() => Utils.getStore("user"));
const loading = ref(false);

const handleSignOut = async () => {
  loading.value = true;

  try {
    await authServices.logoutUser();
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <v-container class="fill-height">
    <v-row align="center" justify="center" class="fill-height">
      <v-col cols="12" sm="8" md="6" lg="5">
        <v-card elevation="2">
          <v-card-title class="text-h5">
            Welcome{{ user?.fName ? `, ${user.fName}` : "" }}
          </v-card-title>

          <v-card-text>
            You are signed in. Todo lists will appear here in a later feature.
          </v-card-text>

          <v-card-actions>
            <v-btn
              color="primary"
              variant="elevated"
              class="oc-cta"
              :loading="loading"
              @click="handleSignOut"
            >
              Sign out
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
