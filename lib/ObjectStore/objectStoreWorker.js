"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const objectDiff_1 = require("./objectDiff");
var ObjectStoreWorker;
(function (ObjectStoreWorker) {
    var workerConstructor = null;
    var workerParameter = null;
    if (typeof Worker !== 'undefined') {
        workerConstructor = Worker;
        workerParameter = URL.createObjectURL(new Blob([`(${objectDiff_1.ObjectDiffScope})(true)`]));
    }
    else {
        workerConstructor = require("webworker-threads").Worker;
        workerParameter = objectDiff_1.ObjectDiffScope;
    }
    function Create() {
        return new workerConstructor(workerParameter);
        ;
    }
    ObjectStoreWorker.Create = Create;
})(ObjectStoreWorker = exports.ObjectStoreWorker || (exports.ObjectStoreWorker = {}));
//# sourceMappingURL=objectStoreWorker.js.map