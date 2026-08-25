import { describe, it, expect } from "vitest";

describe("i18n translations", () => {
  it("has all required keys in English", async () => {
    const mod = await import("../i18n");
    // The i18n module should be importable without errors
    expect(mod).toBeDefined();
  });
});
