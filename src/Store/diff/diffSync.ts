import { ObjectDiff } from "./objectDiff";
import { IDiffMethod, IDiffResponse, Diff } from "./diff.types";

export class DiffSync implements Diff {

    private diff: {(data: IDiffMethod): any};

    constructor() {
        this.diff = ObjectDiff();
        this.diff({
            method: "create",
            arguments: []
        });
    }

    public DiffBatch(batch:  Array<{ path: string, newValue: any, oldValue: any }>) {
        return Promise.resolve(this.diff({
            method: "diffbatch",
            arguments: [batch]
        }));
    }

    public Destroy() { }
    
}