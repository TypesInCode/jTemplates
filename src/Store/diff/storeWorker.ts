import { ObjectDiffScope } from "./objectDiff";

export namespace StoreWorker {
    var workerConstructor: any = null;
    var workerParameter: any = null;
    if(typeof Worker !== 'undefined') {
        workerConstructor = Worker;
        workerParameter = URL.createObjectURL(new Blob([`(${ObjectDiffScope})(false)`]));
    }
    
    export function Create() {
        if(!workerConstructor)
            throw "Worker is not available";
        
        return new workerConstructor(workerParameter) as Worker;
    }
}