import { ObjectDiffScope } from "../objectDiff";

export namespace StoreWorker {
    var workerConstructor: any = null;
    var workerParameter: any = null;
    if(typeof Worker !== 'undefined') {
        workerConstructor = Worker;
        workerParameter = URL.createObjectURL(new Blob([`(${ObjectDiffScope})(false)`]));
    }
    else {
        workerConstructor = (require("webworker-threads").Worker as any);
        workerParameter = ObjectDiffScope;
    }
    
    export function Create() {
        return new workerConstructor(workerParameter) as Worker;
    }
}