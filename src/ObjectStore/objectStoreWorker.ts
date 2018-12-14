import { ObjectDiffScope } from "./objectDiff";

export namespace ObjectStoreWorker {
    var workerConstructor: any = null;
    var workerParameter: any = null;
    if(typeof Worker !== 'undefined') {
        workerConstructor = Worker;
        workerParameter = URL.createObjectURL(new Blob([`(${ObjectDiffScope})(true)`]));
    }
    else {
        workerConstructor = (require("webworker-threads") as any).Worker;
        workerParameter = ObjectDiffScope;
    }
    
    export function Create() {
        return new workerConstructor(workerParameter) as Worker;;
    }
}