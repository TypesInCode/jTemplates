import { JsonMerge, JsonDeepClone } from "../../Utils/json";
import { DiffSync } from "../Diff/diffSync";
import { GET_OBSERVABLE_VALUE } from "../Tree/observableNode";
import { Store } from "./store";

export class StoreSync extends Store {
  private diff: DiffSync;

  constructor(keyFunc?: (value: any) => string | undefined) {
    super(keyFunc);

    this.diff = new DiffSync(keyFunc);
  }

  Write(data: unknown, key?: string) {
    data = JsonDeepClone(data);
    key = key || this.keyFunc?.(data);

    if (!key) throw "No key provided for data";

    const diffResult = this.diff.DiffPath(key, data);

    this.UpdateRootMap(diffResult);
  }

  Patch(key: string, patch: unknown) {
    const value = this.Get(key);
    if (value === undefined) throw "Unable to patch undefined value";

    const json = (value as any).toJSON();
    const mergedJson = JsonMerge(json, patch);

    const diffResult = this.diff.DiffPath(key, mergedJson);
    this.UpdateRootMap(diffResult);
  }

  Push(key: string, ...data: unknown[]) {
    const arr = this.Get(key) as any[];
    const batch = data.map(function (d, i) {
      return {
        path: `${key}.${arr.length + i}`,
        value: d,
      };
    });

    const diffResult = this.diff.DiffBatch(batch);
    this.UpdateRootMap(diffResult);
  }

  Splice(
    key: string,
    start: number,
    deleteCount?: number,
    ...items: unknown[]
  ) {
    const arr = this.Get(key) as any[];
    const arrValue = (arr as any)[GET_OBSERVABLE_VALUE] as any[];
    const arrCopy = arrValue.slice();

    const spliceResult = JsonDeepClone(
      arrCopy.splice(start, deleteCount, ...items),
    );
    const diffResult = this.diff.DiffPath(key, arrCopy);
    this.UpdateRootMap(diffResult);
    return spliceResult;
  }
}
