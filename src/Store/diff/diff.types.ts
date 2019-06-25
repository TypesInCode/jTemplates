export interface IDiffMethod {
    method: string;
    arguments: Array<any>;
}

export interface IDiffResponse {
    changedPaths: Array<string>;
    deletedPaths: Array<string>;
    // pathDependencies: Array<{ path: string, targets: Array<string> }>;
}

export interface Diff {
    DiffBatch(batch: Array<{ path: string, newValue: any, oldValue: any }>): Promise<IDiffResponse>;
    Diff(path: string, newValue: any, resolveOldValue: { (): any }): Promise<IDiffResponse>;
}