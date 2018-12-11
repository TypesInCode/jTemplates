interface IPostMessage {
    changedPaths: Array<string>;
    deletedPaths: Array<string>;
    processedIds: Array<{
        newId: string;
        oldId: string;
        path: string;
    }>;
    rootPath: string;
}
interface IMessage {
    oldValue: any;
    newValue: any;
    path: string;
    idFunction: string;
}
