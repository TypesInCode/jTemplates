import { DiffTreeScope, IDiffTree } from "./diffTree";

const diffCnstr = DiffTreeScope();
export class DiffSync {

    private diffTree: IDiffTree;

    constructor(keyFunc?: {(val: any): string}) {
        this.diffTree = new diffCnstr(keyFunc);
    }

    public static GetKeyRef(key: string) {
        return diffCnstr.GetKeyRef(key);
    }

    public static ReadKeyRef(ref: string) {
        return diffCnstr.ReadKeyRef(ref);
    }

    public DiffPath(path: string, value: any) {
        return this.diffTree.DiffPath(path, value);
    }

    public DiffBatch(data: Array<{ path: string, value: any }>) {
        return this.diffTree.DiffBatch(data);
    }

}
