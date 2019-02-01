"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const storeManager_1 = require("./storeManager");
const storeReader_1 = require("./storeReader");
const storeWriter_1 = require("./storeWriter");
const storeQuery_1 = require("./storeQuery");
class Store {
    constructor(idFunction) {
        this.manager = new storeManager_1.StoreManager(idFunction);
        this.reader = new storeReader_1.StoreReader(this.manager);
        this.writer = new storeWriter_1.StoreWriter(this.manager);
        this.queryCache = new Map();
    }
    get Root() {
        return this.reader.Root;
    }
    Action(action) {
        action(this.reader, this.writer);
    }
    Query(id, queryFunc) {
        if (this.queryCache.has(id))
            return this.queryCache.get(id);
        var query = new storeQuery_1.StoreQuery(this.manager, queryFunc);
        query.addListener("destroy", () => {
            this.queryCache.delete(id);
        });
        return query;
    }
    Destroy() {
        this.queryCache.forEach(q => q.Destroy());
        this.queryCache.clear();
        this.manager.Destroy();
    }
}
exports.Store = Store;
(function (Store) {
    function Create(init, idFunction) {
        var store = new Store(idFunction);
        store.Action((reader, writer) => {
            writer.WritePath("root", init);
        });
        return store;
    }
    Store.Create = Create;
})(Store = exports.Store || (exports.Store = {}));
//# sourceMappingURL=store.js.map