import type { z } from "zod";

/**
 * Field errors for a form validated by a zod object schema. They stay hidden
 * until the first submit, then follow the user's input; read them by field name.
 */
export const useFormErrors = <S extends z.ZodObject>(schema: S, state: Partial<z.input<S>>) => {
  const submitted = ref(false);

  const errors = computed(() => {
    if (!submitted.value) {
      return {};
    }

    const result = schema.safeParse(state);

    if (result.success) {
      return {};
    }

    return Object.fromEntries(
      result.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
    );
  });

  const markSubmitted = () => {
    submitted.value = true;
  };

  return { errors, markSubmitted };
};
