const GUESS_PATTERN = /[^A-Z0-9 ]/g;

export function sanitizeAirRiddleGuess(value: string, maxLength: number): string {
  return value.toUpperCase().replace(GUESS_PATTERN, "").slice(0, maxLength);
}

export function useAirRiddleGuess(maxLength: Ref<number>) {
  const currentGuess = ref("");

  watch(maxLength, (length) => {
    if (currentGuess.value.length > length) {
      currentGuess.value = currentGuess.value.slice(0, length);
    }
  });

  function setGuess(value: string) {
    currentGuess.value = sanitizeAirRiddleGuess(value, maxLength.value);
  }

  function appendToGuess(value: string) {
    if (!value || currentGuess.value.length >= maxLength.value) {
      return;
    }
    currentGuess.value = sanitizeAirRiddleGuess(currentGuess.value + value, maxLength.value);
  }

  function removeFromGuess() {
    currentGuess.value = currentGuess.value.slice(0, -1);
  }

  function clearGuess() {
    currentGuess.value = "";
  }

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
}
