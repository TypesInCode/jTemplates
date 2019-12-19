"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class StoreReader {
    constructor(store) {
        this.store = store;
        this.watching = false;
    }
    get Root() {
        var node = this.store.GetNode("root");
        return node.Proxy;
    }
    get Emitters() {
        return this.emitterSet;
    }
    get Watching() {
        return this.watching;
    }
    set Watching(val) {
        this.emitterSet = val ? new Set() : this.emitterSet;
        this.watching = val;
    }
    Get(id) {
        return this.store.GetIdNode(id).Proxy;
    }
    Destroy() {
        this.watching = false;
        this.emitterSet.clear();
    }
}
exports.StoreReader = StoreReader;
//# sourceMappingURL=storeReader.js.map