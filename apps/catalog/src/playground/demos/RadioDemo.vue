<script setup lang="ts">
import { RadioGroup } from "@sarpbc/design";
import { ref } from "vue";

import { TEAMS } from "../teams.ts";

const value = ref<string | null>("kc");
</script>

<template>
  <div style="display: grid; gap: 1.5rem">
    <RadioGroup v-model="value" :items="TEAMS" />
    <RadioGroup v-model="value" :items="TEAMS" orientation="horizontal" variant="cards" />
  </div>
</template>
