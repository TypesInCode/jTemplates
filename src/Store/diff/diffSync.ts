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

    /* public GetPath(id: string): string {
        return this.diff({
            method: "getpath",
            arguments: [id]
        });
    } */

    public Diff(path: string, newValue: any, resolveOldValue: {(): any}): Promise<IDiffResponse> {
        return Promise.resolve(this.diff({
            method: "diff",
            arguments: [path, newValue, resolveOldValue()]
        }));
    }
    
}