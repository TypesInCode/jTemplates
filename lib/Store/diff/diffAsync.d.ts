import { Diff } from "./diff.types";
export declare class DiffAsync implements Diff {
    private workerQueue;
    constructor();
    DiffBatch(batch: Array<{
        path: string;
        newValue: any;
        oldValue: any;
    }>): Promise<any>;
    Diff(path: string, newValue: any, resolveOldValue: {
        (): any;
    }): Promise<any>;
    Destroy(): void;
}
