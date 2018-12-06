/* declare module "worker-loader!*" {
    class WebpackWorker extends Worker {
      constructor();
    }
  
    export default WebpackWorker;
  } */

interface IPostMessage {
    wasNull: boolean;
    changedPaths: Array<string>;
    deletedPaths: Array<string>;
    processedIds: Array<{
        newId: string,
        oldId: string,
        path: string
    }>;
    skipDependents: boolean;
    rootPath: string;
}

interface IMessage {
    oldValue: any;
    newValue: any;
    path: string;
    idFunction: string;
    skipDependents: boolean;
}