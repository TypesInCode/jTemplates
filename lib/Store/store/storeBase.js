"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const storeManager_1 = require("./storeManager");
const storeReader_1 = require("./storeReader");
const storeWriter_1 = require("./storeWriter");
const promiseQueue_1 = require("../../Promise/promiseQueue");
const scope_1 = require("../scope/scope");
class AbstractStore {
    ActionSync(action) { }
    Action(action) {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    Update(updateCallback) {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    Merge(value) {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    Write(value) {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    Get(id) {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    Query(queryFunc) {
        return null;
    }
}
exports.AbstractStore = AbstractStore;
class StoreBase {
    constructor(idFunction, init, diff) {
        this.manager = new storeManager_1.StoreManager(idFunction, diff);
        this.reader = new storeReader_1.StoreReader(this.manager);
        this.writer = new storeWriter_1.StoreWriter(this.manager);
        this.promiseQueue = new promiseQueue_1.PromiseQueue();
        this.Action(() => __awaiter(this, void 0, void 0, function* () {
            yield this.manager.WritePath("root", init);
        }));
        this.rootScope = new scope_1.Scope(() => {
            var value = null;
            this.ActionSync(reader => value = reader.Root);
            return value || init;
        });
    }
    get Root() {
        return this.rootScope;
    }
    Action(action) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.promiseQueue.Push((resolve) => {
                resolve(action(this.reader, this.writer));
            });
        });
    }
    ActionSync(action) {
        action(this.reader);
    }
    Next(action) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.Action(() => __awaiter(this, void 0, void 0, function* () { }));
            action && action();
        });
    }
    Update(value) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.Action((reader, writer) => __awaiter(this, void 0, void 0, function* () {
                yield writer.Update(reader.Root, value);
            }));
        });
    }
    Merge(value) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.Action((reader, writer) => __awaiter(this, void 0, void 0, function* () {
                yield writer.Merge(reader.Root, value);
            }));
        });
    }
    Get(id) {
        var ret = null;
        this.ActionSync(reader => {
            ret = reader.Get(id);
        });
        return ret;
    }
    Write(value) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.Action((reader, writer) => __awaiter(this, void 0, void 0, function* () {
                yield writer.Write(value);
            }));
        });
    }
    Query(queryFunc) {
        return new scope_1.Scope(() => {
            var value = null;
            this.ActionSync(reader => value = queryFunc(reader));
            return value;
        });
    }
    Destroy() {
        this.rootScope.Destroy();
        this.manager.Destroy();
    }
}
exports.StoreBase = StoreBase;
//# sourceMappingURL=storeBase.js.map