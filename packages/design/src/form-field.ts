import { inject } from "vue";

import type { ComputedRef, InjectionKey } from "vue";

/** What a FormField hands to the control inside it, like Nuxt UI's form field context. */
export interface FormFieldContext {
  describedBy: ComputedRef<string | undefined>;
  id: string;
  invalid: ComputedRef<boolean>;
}

export const FORM_FIELD: InjectionKey<FormFieldContext> = Symbol("sarpbc-form-field");

export const useFormField = (): FormFieldContext | null => inject(FORM_FIELD, null);
