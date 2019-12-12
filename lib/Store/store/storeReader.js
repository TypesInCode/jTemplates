"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
const scopeCollector_1 = require("../scope/scopeCollector");
class StoreReader {
    constructor(store) {
        this.store = store;
        this.watching = false;
    }
    get Root() {
        var node = this.store.GetNode("root");
        node && this.Register(node.Emitter);
        return utils_1.CreateProxy(node, this);
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
        var node = this.store.GetIdNode(id);
        node && this.Register(node.Emitter);
        return node && utils_1.CreateProxy(node, this);
    }
    Register(emitter) {
        if (this.watching && !this.emitterSet.has(emitter))
            this.emitterSet.add(emitter);
        scopeCollector_1.ScopeCollector.Register(emitter);
    }
    Destroy() {
        this.watching = false;
        this.emitterSet.clear();
    }
}
exports.StoreReader = StoreReader;
//# sourceMappingURL=storeReader.js.map