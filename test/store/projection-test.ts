import { describe, it, expect } from "vitest";
import { StoreSync } from "../../src/Store/Store/storeSync";
import { KeyFunc, routes, projectionCases } from "./projection-cases";

projectionCases("StoreSync", () => new StoreSync(KeyFunc, routes));

describe("StoreSync projection construction", () => {
  it("rejects a projection cycle at construction, synchronously", () => {
    expect(
      () =>
        new StoreSync(KeyFunc, {
          "/": {
            projections: {
              a: { reads: [`$projection_b`], projection: (b: any) => b },
              b: { reads: [`$projection_a`], projection: (a: any) => a },
            }
          }
        }),
    ).toThrow(/cycle/i);
  });
});

/*
new SequentialProjector({
  key: { reads: [`$projection_a`], projection: (b: any) => b }
}, [
  {
    route: '/channel/{channelId}',
    definition: (params: { [key: string]: string }) => ({
      a: {
        reads: [`/river/${params.channelId}`, `names`],
        projection: (river, names) => "test"
      }
    })
  }
])
*/
