import { readonly, ref } from "vue";

import type { ToastMessage } from "./types.ts";

interface QueuedToast extends ToastMessage {
  id: number;
}

// WARNING: add toasts only in the browser (they come from user actions), never during SSR.
const queue = ref<QueuedToast[]>([]);
let nextId = 0;

export const toasts = readonly(queue);

export const dismissToast = (id: number) => {
  queue.value = queue.value.filter((toast) => toast.id !== id);
};

export const useToast = () => ({
  add: (toast: ToastMessage) => {
    nextId += 1;
    queue.value = [...queue.value, { ...toast, id: nextId }];
  },
});
