import { AsyncQueue } from "../../Utils/asyncQueue";
import { JsonDeepClone, JsonMerge } from "../../Utils/json";
import { DiffAsync } from "../Diff/diffAsync";
import { GET_OBSERVABLE_VALUE } from "../Tree/observableNode";
import { Store } from "./store";

export class StoreAsync extends Store {
  private diff: DiffAsync;
  private queue = new AsyncQueue();

  constructor(keyFunc: (value: unknown) => string) {
    super(keyFunc);

    this.diff = new DiffAsync(keyFunc);
  }

  async Write(data: unknown, key?: string) {
    await this.queue.Next(async () => {
      key = key || this.keyFunc(data);

      if(!key)
        throw "No key provided for data";

      const diffResult = await this.diff.DiffPath(key, data);
      this.UpdateRootMap(diffResult);
    });
  }

  async Patch(key: string, patch: unknown) {
    await this.queue.Next(async () => {
      const value = this.Get(key);
      if(value === undefined)
        throw "Unable to patch undefined value";

      const json = (value as any).toJSON();
      const mergedJson = JsonMerge(json, patch);

      const diffResult = await this.diff.DiffPath(key, mergedJson);
      this.UpdateRootMap(diffResult)
    });
  }

  async Push(key: string, ...data: unknown[]) {
    await this.queue.Next(async () => {
      const arr = this.Get(key) as any[];

      const batch = data.map(function(d, i) {
        return {
          path: `${key}.${arr.length + i}`,
          value: d
        };
      });
      
      const diffResult = await this.diff.DiffBatch(batch);
      this.UpdateRootMap(diffResult);
    });
  }

  async Splice(key: string, start: number, deleteCount?: number, ...items: unknown[]) {
    return await this.queue.Next(async () => {
      const arr = this.Get(key) as any[];
      const arrValue = (arr as any)[GET_OBSERVABLE_VALUE] as any[];
      const arrCopy = arrValue.slice();

      const spliceResult = JsonDeepClone(arrCopy.splice(start, deleteCount, ...items));
      const diffResult = await this.diff.DiffPath(key, arrCopy);
      this.UpdateRootMap(diffResult);
      return spliceResult;
    });
  }

  Destroy() {
    this.queue.Stop();
    this.diff.Destroy();
  }
}
