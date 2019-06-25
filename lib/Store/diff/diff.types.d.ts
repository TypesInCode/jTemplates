export interface IDiffMethod {
    method: string;
    arguments: Array<any>;
}
export interface IDiffResponse {
    changedPaths: Array<string>;
    deletedPaths: Array<string>;
}
export interface Diff {
    Diff(path: string, newValue: any, resolveOldValue: {
        (): any;
    }): Promise<IDiffResponse>;
}
