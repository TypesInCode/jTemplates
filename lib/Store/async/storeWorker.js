"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const objectDiff_1 = require("../objectDiff");
var StoreWorker;
(function (StoreWorker) {
    var workerConstructor = null;
    var workerParameter = null;
    if (typeof Worker !== 'undefined') {
        workerConstructor = Worker;
        workerParameter = URL.createObjectURL(new Blob([`(${objectDiff_1.ObjectDiffScope})(false)`]));
    }
    else {
        workerConstructor = require("webworker-threads").Worker;
        workerParameter = objectDiff_1.ObjectDiffScope;
    }
    function Create() {
        return new workerConstructor(workerParameter);
    }
    StoreWorker.Create = Create;
})(StoreWorker = exports.StoreWorker || (exports.StoreWorker = {}));
//# sourceMappingURL=storeWorker.js.map