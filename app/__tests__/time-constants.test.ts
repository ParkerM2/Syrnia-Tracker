import { MS_PER_MINUTE, MS_PER_HOUR, MS_PER_DAY, MS_PER_WEEK } from "../utils/time-constants";
import { describe, it, expect } from "vitest";

describe("time constants", () => {
  it("MS_PER_MINUTE is 60000", () => {
    expect(MS_PER_MINUTE).toBe(60_000);
  });

  it("MS_PER_HOUR is 3600000", () => {
    expect(MS_PER_HOUR).toBe(3_600_000);
  });

  it("MS_PER_DAY is 86400000", () => {
    expect(MS_PER_DAY).toBe(86_400_000);
  });

  it("MS_PER_WEEK is 604800000", () => {
    expect(MS_PER_WEEK).toBe(604_800_000);
  });
});
