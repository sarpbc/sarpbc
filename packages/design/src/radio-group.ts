import { inject } from "vue";

import type { RadioVariant } from "./types.ts";
import type { InjectionKey, Ref } from "vue";

export const RADIO_GROUP: InjectionKey<{ variant: Readonly<Ref<RadioVariant>> }> =
  Symbol("sarpbc-radio-group");

export const useRadioGroup = (): { variant: Readonly<Ref<RadioVariant>> } | null =>
  inject(RADIO_GROUP, null);
