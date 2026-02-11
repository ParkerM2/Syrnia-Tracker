import { describe, expect, it } from "vitest";

describe("smoke tests", () => {
  it("should resolve @app alias imports", async () => {
    const utils = await import("@app/utils");
    expect(utils).toBeDefined();
  });

  it("should resolve @app/utils/formatting", async () => {
    const formatting = await import("@app/utils/formatting");
    expect(formatting).toBeDefined();
  });
});
