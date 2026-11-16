import { inject } from "vue";

import type { ComputedRef, InjectionKey } from "vue";

export interface FormFieldContext {
  describedBy: ComputedRef<string | undefined>;
  id: string;
  invalid: ComputedRef<boolean>;
}

export const FORM_FIELD: InjectionKey<FormFieldContext> = Symbol("sarpbc-form-field");

export const useFormField = (): FormFieldContext | null => inject(FORM_FIELD, null);
