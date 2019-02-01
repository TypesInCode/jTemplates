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
const storeAsyncManager_1 = require("./storeAsyncManager");
const storeAsyncReader_1 = require("./storeAsyncReader");
const storeAsyncWriter_1 = require("./storeAsyncWriter");
const storeAsyncQuery_1 = require("./storeAsyncQuery");
const promiseQueue_1 = require("../../Promise/promiseQueue");
class StoreAsync {
    constructor(idFunction) {
        this.manager = new storeAsyncManager_1.StoreAsyncManager(idFunction);
        this.reader = new storeAsyncReader_1.StoreAsyncReader(this.manager);
        this.writer = new storeAsyncWriter_1.StoreAsyncWriter(this.manager);
        this.promiseQueue = new promiseQueue_1.PromiseQueue();
        this.queryCache = new Map();
    }
    get OnComplete() {
        return this.promiseQueue.OnComplete.then(() => {
            return this;
        });
    }
    get Root() {
        return this.reader.Root;
    }
    Action(action) {
        return this.promiseQueue.Push(resolve => resolve(action(this.reader, this.writer)));
    }
    Query(id, defaultValue, queryFunc) {
        if (this.queryCache.has(id))
            return this.queryCache.get(id);
        var query = new storeAsyncQuery_1.StoreAsyncQuery(this.manager, defaultValue, (reader, writer) => __awaiter(this, void 0, void 0, function* () {
            return yield this.promiseQueue.Push(resolve => {
                resolve(queryFunc(reader, writer));
            });
        }));
        var destroy = () => {
            this.queryCache.delete(id);
            query.removeListener("destroy", destroy);
        };
        query.addListener("destroy", destroy);
        return query;
    }
    Destroy() {
        this.promiseQueue.Stop();
        this.queryCache.forEach(q => q.Destroy());
        this.queryCache.clear();
        this.manager.Destroy();
    }
}
exports.StoreAsync = StoreAsync;
(function (StoreAsync) {
    function Create(init, idFunction) {
        var store = new StoreAsync(idFunction);
        store.Action((reader, writer) => __awaiter(this, void 0, void 0, function* () {
            yield writer.WritePath("root", init);
        }));
        return store;
    }
    StoreAsync.Create = Create;
})(StoreAsync = exports.StoreAsync || (exports.StoreAsync = {}));
//# sourceMappingURL=storeAsync.js.map