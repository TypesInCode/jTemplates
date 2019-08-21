import { Diff } from "./diff.types";
export declare class DiffSync implements Diff {
    private diff;
    constructor();
    DiffBatch(batch: Array<{
        path: string;
        newValue: any;
        oldValue: any;
    }>): Promise<any>;
    Destroy(): void;
}
