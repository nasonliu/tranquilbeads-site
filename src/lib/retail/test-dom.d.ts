// The retail-only TypeScript project includes UI tests but intentionally does
// not load Vitest's runtime setup file. Import matcher declarations here so
// those tests retain the same DOM assertion contract at compile time.
import "@testing-library/jest-dom/vitest";
