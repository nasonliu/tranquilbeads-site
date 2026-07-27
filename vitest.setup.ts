import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

afterEach(async () => {
  if (!document.body.childNodes.length) return;
  const { cleanup } = await import("@testing-library/react");
  cleanup();
});
