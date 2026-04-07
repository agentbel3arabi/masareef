import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges simple class strings", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("resolves Tailwind conflicts (last wins)", () => {
    const result = cn("p-4", "p-8");
    expect(result).toBe("p-8");
  });

  it("resolves conflicting text sizes", () => {
    const result = cn("text-sm", "text-lg");
    expect(result).toBe("text-lg");
  });

  it("handles undefined inputs", () => {
    expect(cn("base", undefined, "active")).toBe("base active");
  });

  it("handles null inputs", () => {
    expect(cn("base", null, "active")).toBe("base active");
  });

  it("handles empty string inputs", () => {
    expect(cn("base", "", "active")).toBe("base active");
  });

  it("handles false/0 inputs", () => {
    expect(cn("base", false, 0, "active")).toBe("base active");
  });

  it("handles conditional class objects", () => {
    const result = cn("base", { active: true, disabled: false });
    expect(result).toBe("base active");
  });

  it("returns empty string with no arguments", () => {
    expect(cn()).toBe("");
  });

  it("handles array inputs", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });
});
