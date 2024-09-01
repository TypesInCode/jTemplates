import { JsonDiffFactory } from "../../Utils/json";
import { DiffTreeFactory } from "./diffTree";

export namespace DiffWorker {
  let workerConstructor: any = null;
  let workerParameter: any = null;
  if (typeof Worker !== "undefined") {
    workerConstructor = Worker;
    workerParameter = URL.createObjectURL(
      new Blob([`(${DiffTreeFactory}).call(this, (${JsonDiffFactory}), true)`]),
    );
  }

  export function Create() {
    if (!workerConstructor) throw "Worker is not available";

    return new workerConstructor(workerParameter) as Worker;
  }
}
