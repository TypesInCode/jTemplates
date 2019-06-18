import { Diff } from "./diff.types";
export declare class DiffAsync implements Diff {
    private workerQueue;
    constructor();
    Diff(path: string, newValue: any, resolveOldValue: {
        (): any;
    }): Promise<any>;
}
