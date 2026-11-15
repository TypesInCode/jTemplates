import { describe, it, expect } from "vitest";
import { IsPattern, PatternMatches, PatternPrefix, WILDCARD } from "../../src/Utils/pattern";

describe("Key patterns", () => {
  it("tells a pattern from an exact key by its final *", () => {
    expect(WILDCARD).to.eq("*");
    expect(IsPattern("task_*")).to.eq(true);
    expect(IsPattern("*")).to.eq(true);
    expect(IsPattern("task_1")).to.eq(false);
    expect(IsPattern("a*b")).to.eq(false);
    expect(IsPattern("")).to.eq(false);
  });

  it("gives a pattern's prefix", () => {
    expect(PatternPrefix("task_*")).to.eq("task_");
    expect(PatternPrefix("*")).to.eq("");
  });

  it("matches an exact key only to itself", () => {
    expect(PatternMatches("task", "task")).to.eq(true);
    expect(PatternMatches("task", "task_1")).to.eq(false);
    expect(PatternMatches("task_1", "task")).to.eq(false);
  });

  it("matches every key that starts with a pattern's prefix, the prefix itself too", () => {
    expect(PatternMatches("task_*", "task_1")).to.eq(true);
    expect(PatternMatches("task_*", "task_")).to.eq(true);
    expect(PatternMatches("task_*", "task")).to.eq(false);
    expect(PatternMatches("task_*", "a_task_1")).to.eq(false);
  });

  it("matches every key with a lone *", () => {
    expect(PatternMatches("*", "anything")).to.eq(true);
    expect(PatternMatches("*", "")).to.eq(true);
  });

  it("compares text as it is: only a final * is special", () => {
    expect(PatternMatches("$projection_*", "$projection_x")).to.eq(true);
    expect(PatternMatches("a.b", "axb")).to.eq(false);
    expect(PatternMatches("q?", "q")).to.eq(false);
    expect(PatternMatches("a*b", "axb")).to.eq(false);
    expect(PatternMatches("a*b", "a*b")).to.eq(true);
  });
});
