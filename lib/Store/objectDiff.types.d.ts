interface IDiffMethod {
    method: string;
    arguments: Array<any>;
}
interface IDiffResponse {
    changedPaths: Array<string>;
    deletedPaths: Array<string>;
    pathDependencies: Array<{
        path: string;
        targets: Array<string>;
    }>;
}
