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
const storeQuery_1 = require("./storeQuery");
class Store {
    constructor(idFunction, init, diff) {
        this.manager = new storeManager_1.StoreManager(idFunction, diff);
        this.reader = new storeReader_1.StoreReader(this.manager);
        this.writer = new storeWriter_1.StoreWriter(this.manager);
        this.promiseQueue = new promiseQueue_1.PromiseQueue();
        this.queryCache = new Map();
        this.init = init;
        this.Action(() => __awaiter(this, void 0, void 0, function* () {
            yield this.manager.WritePath("root", init);
        }));
    }
    get Root() {
        return this.Query("root", this.init, (reader) => Promise.resolve(reader.Root));
    }
    Action(action) {
        return this.promiseQueue.Push((resolve) => {
            resolve(action(this.reader, this.writer));
        });
    }
    Write(readOnly, updateCallback) {
        return this.Action((reader, writer) => __awaiter(this, void 0, void 0, function* () {
            yield writer.Write(readOnly, updateCallback);
        }));
    }
    Query(id, defaultValue, queryFunc) {
        if (this.queryCache.has(id))
            return this.queryCache.get(id);
        var query = new storeQuery_1.StoreQuery(this.manager, defaultValue, (reader, writer) => __awaiter(this, void 0, void 0, function* () {
            return yield this.promiseQueue.Push(resolve => {
                resolve(queryFunc(reader, writer));
            });
        }));
        var destroy = () => {
            this.queryCache.delete(id);
            query.removeListener("destroy", destroy);
        };
        query.addListener("destroy", destroy);
        this.queryCache.set(id, query);
        return query;
    }
    Destroy() {
        this.queryCache.forEach(q => q.Destroy());
        this.queryCache.clear();
        this.manager.Destroy();
    }
}
exports.Store = Store;
//# sourceMappingURL=store.js.map