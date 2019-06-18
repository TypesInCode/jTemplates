import { IDiffResponse, Diff } from "./diff.types";
export declare class DiffSync implements Diff {
    private diff;
    constructor();
    Diff(path: string, newValue: any, resolveOldValue: {
        (): any;
    }): Promise<IDiffResponse>;
}
