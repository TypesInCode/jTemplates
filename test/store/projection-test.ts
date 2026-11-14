import { describe, it, expect } from "vitest";
import { StoreSync } from "../../src/Store/Store/storeSync";
import { ObservableDiffTree } from "../../src/Store/Diff/observableDiffTree";
import { KeyFunc, routes, projectionCases } from "./projection-cases";

projectionCases("StoreSync", () => new StoreSync(new ObservableDiffTree({ keyFunc: KeyFunc, routes })));

describe("StoreSync projection cycles", () => {
  it("throws a projection cycle on the first change", () => {
    const store = new StoreSync(new ObservableDiffTree({ keyFunc: KeyFunc, routes: {
      "/": {
        projections: {
          a: { reads: [`$projection_b`], projection: (b: any) => b },
          b: { reads: [`$projection_a`], projection: (a: any) => a },
        }
      }
    } }));

    expect(() => store.Write({ value: 1 }, "x")).toThrow(/cycle/i);
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
