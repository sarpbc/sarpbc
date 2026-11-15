<script setup lang="ts">
import { RadioGroup } from "@sarpbc/design";
import { ref } from "vue";

import { TEAMS } from "../teams.ts";

const value = ref<string | null>("kc");

const roles = [
  { description: "Sets the pace and takes the first touch.", label: "Striker", value: "striker" },
  { description: "Reads the play and covers rotations.", label: "Playmaker", value: "playmaker" },
];

const role = ref<string | null>("striker");

const languages = [
  { ariaLabel: "English", label: "EN", value: "en" },
  { ariaLabel: "French", label: "FR", value: "fr" },
];

const language = ref<string | null>("en");
</script>

<template>
  <div style="display: grid; gap: 1.5rem">
    <RadioGroup v-model="value" :items="TEAMS" />
    <RadioGroup v-model="value" :items="TEAMS" orientation="horizontal" variant="cards" />
    <RadioGroup v-model="role" :items="roles" variant="cards" style="width: 20rem" />
    <RadioGroup
      v-model="language"
      :items="languages"
      orientation="horizontal"
      variant="text"
      aria-label="Language"
    />
  </div>
</template>
