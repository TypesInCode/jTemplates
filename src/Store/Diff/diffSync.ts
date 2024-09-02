import { JsonDiffFactory } from "../../Utils/json";
import { JsonDeepClone } from "../../Utils/jsonDeepClone";
import { DiffTreeFactory, IDiffTree } from "./diffTree";

const diffCnstr = DiffTreeFactory(JsonDiffFactory);
export class DiffSync implements IDiffTree {
  private diffTree: IDiffTree;

  constructor(keyFunc?: { (val: any): string }) {
    this.diffTree = new diffCnstr(keyFunc);
  }

  /* public static GetKeyRef(key: string) {
        return diffCnstr.GetKeyRef(key);
    }

    public static ReadKeyRef(ref: string) {
        return diffCnstr.ReadKeyRef(ref);
    } */

  public DiffPath(path: string, value: any) {
    value = JsonDeepClone(value);
    return this.diffTree.DiffPath(path, value);
  }

  public DiffBatch(data: Array<{ path: string; value: any }>) {
    data = JsonDeepClone(data);

    return this.diffTree.DiffBatch(data);
  }

  /* public UpdatePath(path: string, value: any) {
        this.diffTree.UpdatePath(path, value);
    } */
}
