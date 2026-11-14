const GUESS_PATTERN = /[^A-Z0-9 ]/gu;

export const sanitizeAirRiddleGuess = (value: string, maxLength: number): string =>
  value.toUpperCase().replaceAll(GUESS_PATTERN, "").slice(0, maxLength);

export const useAirRiddleGuess = (maxLength: Ref<number>) => {
  const currentGuess = ref("");

  watch(maxLength, (length) => {
    if (currentGuess.value.length > length) {
      currentGuess.value = currentGuess.value.slice(0, length);
    }
  });

  const setGuess = (value: string) => {
    currentGuess.value = sanitizeAirRiddleGuess(value, maxLength.value);
  };

  const appendToGuess = (value: string) => {
    if (!value || currentGuess.value.length >= maxLength.value) {
      return;
    }

    currentGuess.value = sanitizeAirRiddleGuess(currentGuess.value + value, maxLength.value);
  };

  const removeFromGuess = () => {
    currentGuess.value = currentGuess.value.slice(0, -1);
  };

  const clearGuess = () => {
    currentGuess.value = "";
  };

  const canSubmit = computed(
    () => currentGuess.value.length === maxLength.value && maxLength.value > 0,
  );

  return {
    currentGuess,
    canSubmit,
    setGuess,
    appendToGuess,
    removeFromGuess,
    clearGuess,
  };
};
