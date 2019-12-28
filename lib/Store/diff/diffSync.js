"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const objectDiff_1 = require("./objectDiff");
class DiffSync {
    constructor() {
        this.diff = objectDiff_1.ObjectDiff();
        this.diff({
            method: "create",
            arguments: []
        });
    }
    DiffBatch(batch) {
        return Promise.resolve(this.diff({
            method: "diffbatch",
            arguments: [batch]
        }));
    }
    Destroy() { }
}
exports.DiffSync = DiffSync;
