"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const objectDiff_1 = require("./objectDiff");
var StoreWorker;
(function (StoreWorker) {
    var workerConstructor = null;
    var workerParameter = null;
    if (typeof Worker !== 'undefined') {
        workerConstructor = Worker;
        workerParameter = URL.createObjectURL(new Blob([`(${objectDiff_1.ObjectDiffScope})(false)`]));
    }
    function Create() {
        if (!workerConstructor)
            throw "Worker is not available";
        return new workerConstructor(workerParameter);
    }
    StoreWorker.Create = Create;
})(StoreWorker = exports.StoreWorker || (exports.StoreWorker = {}));
