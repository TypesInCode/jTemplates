import { JsonDiffFactory } from "../../Utils/json";
import { DiffTreeFactory, IDiffTree } from "./diffTree";

const diffCnstr = DiffTreeFactory(JsonDiffFactory);
export class DiffSync implements IDiffTree {
  private diffTree: IDiffTree;

  constructor(keyFunc?: { (val: any): string }) {
    this.diffTree = new diffCnstr(keyFunc);
  }

  public DiffPath(path: string, value: any) {
    return this.diffTree.DiffPath(path, value);
  }

  public DiffBatch(data: Array<{ path: string; value: any }>) {
    return this.diffTree.DiffBatch(data);
  }
}
