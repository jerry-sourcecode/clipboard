<script setup lang="ts">
import { NPageHeader, NNotificationProvider, NModalProvider } from "naive-ui";
import { RouterView, useRoute, useRouter } from "vue-router";

const router = useRouter();
const route = useRoute();

function goHome() {
  router.push("/");
}
</script>

<template>
  <n-page-header title="云剪切板" class="page-header" @back="goHome">
    <template #back v-if="route.path === '/'" />
  </n-page-header>
  <n-notification-provider>
    <n-modal-provider>
      <RouterView />
    </n-modal-provider>
  </n-notification-provider>
</template>

<style>
.page-header {
  margin: 16px;
}
</style>
