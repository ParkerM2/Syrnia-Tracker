import { escapeCSVField, parseCSVLine } from "../utils/csv-helpers";
import { describe, it, expect } from "vitest";

describe("escapeCSVField", () => {
  it("returns empty string for null/undefined", () => {
    expect(escapeCSVField(null)).toBe("");
    expect(escapeCSVField(undefined)).toBe("");
  });

  it("returns plain string unchanged", () => {
    expect(escapeCSVField("hello")).toBe("hello");
  });

  it("wraps fields with commas in quotes", () => {
    expect(escapeCSVField("hello,world")).toBe('"hello,world"');
  });

  it("wraps fields with quotes and escapes them", () => {
    expect(escapeCSVField('say "hi"')).toBe('"say ""hi"""');
  });

  it("wraps fields with newlines in quotes", () => {
    expect(escapeCSVField("line1\nline2")).toBe('"line1\nline2"');
  });
});

describe("parseCSVLine", () => {
  it("splits simple comma-separated values", () => {
    expect(parseCSVLine("a,b,c")).toEqual(["a", "b", "c"]);
  });

  it("handles quoted fields with commas", () => {
    expect(parseCSVLine('"hello,world",b,c')).toEqual(["hello,world", "b", "c"]);
  });

  it("handles escaped quotes inside quoted fields", () => {
    expect(parseCSVLine('"say ""hi""",b')).toEqual(['say "hi"', "b"]);
  });

  it("handles empty fields", () => {
    expect(parseCSVLine("a,,c")).toEqual(["a", "", "c"]);
  });

  it("handles single field", () => {
    expect(parseCSVLine("hello")).toEqual(["hello"]);
  });
});
