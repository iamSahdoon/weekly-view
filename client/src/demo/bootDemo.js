import { apiClient } from "../services/apiClient.js";
import { createDemoAdapter } from "./demoAdapter.js";
import { createDemoStore } from "./demoStore.js";
import { PERSPECTIVES } from "./fixtures.js";

// Loaded by main.jsx under /demo only (frontend_architecture.md §11.2): builds the
// store and installs the adapter on the one axios instance, for the life of the
// page. Nothing outside apiClient's consumers and the demo chooser imports this.

let store = null;

export function bootDemo() {
  store = createDemoStore();
  apiClient.defaults.adapter = createDemoAdapter(store);
}

export const demo = {
  /** "member" | "manager" | "admin". The chooser then reads `Me` through A4. */
  setPerspective(perspective) {
    store.session.userId = PERSPECTIVES[perspective];
  },
};
