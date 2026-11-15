<script setup lang="ts">
import { Select } from "@sarpbc/design";
import { ref } from "vue";

import { TEAMS } from "../teams.ts";

const value = ref<string | null>(null);
</script>

<template>
  <Select v-model="value" :items="TEAMS" placeholder="Choose a team" style="width: 14rem" />
</template>
