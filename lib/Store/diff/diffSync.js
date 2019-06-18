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
    Diff(path, newValue, resolveOldValue) {
        return Promise.resolve(this.diff({
            method: "diff",
            arguments: [path, newValue, resolveOldValue()]
        }));
    }
}
exports.DiffSync = DiffSync;
//# sourceMappingURL=diffSync.js.map