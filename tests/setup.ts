import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// globals:false means React Testing Library's automatic cleanup is not wired
// up, so rendered trees would otherwise persist across tests and their effects
// (polling intervals, timeouts, window listeners in components such as the
// member notification menu) keep running. When a later file's jsdom environment
// is torn down, a leaked timer fires against a missing `window`, surfacing as a
// cross-file "window is not defined" unhandled error. Unmount after every test
// so each component's useEffect cleanup clears its timers and listeners.
afterEach(() => {
  cleanup();
});
