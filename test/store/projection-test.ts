import { describe, it, expect } from "vitest";
import { StoreSync } from "../../src/Store/Store/storeSync";
import { KeyFunc, projections, projectionCases } from "./projection-cases";
import { SequentialProjector } from "../../src/Store/Diff/sequentialProjector";

projectionCases("StoreSync", () => new StoreSync(KeyFunc, new SequentialProjector(projections)));

describe("StoreSync projection construction", () => {
  it("rejects a projection cycle at construction, synchronously", () => {
    expect(
      () =>
        new StoreSync(KeyFunc, new SequentialProjector({
          a: { reads: [`$projection_b`], projection: (b: any) => b },
          b: { reads: [`$projection_a`], projection: (a: any) => a },
        })),
    ).toThrow(/cycle/i);
  });
});
