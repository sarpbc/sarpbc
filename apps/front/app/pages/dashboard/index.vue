<script setup lang="ts">
const syncTeam = async () => {
  await syncTeamFromPandascore();
};
</script>

<template>
  <NuxtLayout name="dashboardheader">
    <DashboardContent>
      <UButton class="w-fit" @click="syncTeam">Sync Team</UButton>
    </DashboardContent>
  </NuxtLayout>
</template>
