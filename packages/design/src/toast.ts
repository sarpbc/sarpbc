import { readonly, ref } from "vue";

import type { ToastMessage } from "./types.ts";

interface QueuedToast extends ToastMessage {
  id: number;
}

/*
 * One queue for the page, read by <SToaster>. Toasts come from user actions,
 * so they are only ever added in the browser, never during SSR.
 */
const queue = ref<QueuedToast[]>([]);
let nextId = 0;

export const toasts = readonly(queue);

export const dismissToast = (id: number): void => {
  queue.value = queue.value.filter((toast) => toast.id !== id);
};

export const useToast = () => ({
  add: (toast: ToastMessage): void => {
    nextId += 1;
    queue.value = [...queue.value, { ...toast, id: nextId }];
  },
});
