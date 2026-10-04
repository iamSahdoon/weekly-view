// The tiny emitter behind "session-expired" (tech_stack.md §6.2). apiClient emits;
// AuthProvider listens once. Nothing else subscribes.

const listeners = new Map();

export const authEvents = {
  on(event, listener) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(listener);
    return () => listeners.get(event).delete(listener);
  },
  emit(event) {
    for (const listener of listeners.get(event) ?? []) listener();
  },
};
