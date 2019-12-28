"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class StoreReader {
    constructor(store) {
        this.store = store;
    }
    get Root() {
        var node = this.store.GetNode("root");
        return node.Proxy;
    }
    Get(id) {
        return this.store.GetIdNode(id).Proxy;
    }
}
exports.StoreReader = StoreReader;
