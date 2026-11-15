<script setup lang="ts">
import { Combobox } from "@sarpbc/design";
import { ref } from "vue";

import { TEAMS } from "../teams.ts";

const value = ref<string | null>(null);
</script>

<template>
  <Combobox v-model="value" :items="TEAMS" placeholder="Search a team" style="width: 14rem" />
</template>
