import { DiffTreeScope } from "./diffTree";

export namespace DiffWorker {
    var workerConstructor: any = null;
    var workerParameter: any = null;
    if(typeof Worker !== 'undefined') {
        workerConstructor = Worker;
        workerParameter = URL.createObjectURL(new Blob([`(${DiffTreeScope}).call(this, true)`]));
    }
    
    export function Create() {
        if(!workerConstructor)
            throw "Worker is not available";
        
        return new workerConstructor(workerParameter) as Worker;
    }
}