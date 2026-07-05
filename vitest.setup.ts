import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Explicit imports (no `globals: true`), so testing-library's automatic
// cleanup never registers — do it ourselves.
afterEach(() => {
  cleanup();
});
