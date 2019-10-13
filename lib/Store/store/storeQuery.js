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
const scopeBase_1 = require("../scope/scopeBase");
const scope_1 = require("../scope/scope");
class StoreQuery extends scopeBase_1.ScopeBase {
    constructor(store, defaultValue, getFunction) {
        super(getFunction, defaultValue);
        this.store = store;
    }
    get Promise() {
        return new Promise((resolve, reject) => {
            if (this.HasValue)
                resolve(this.Value);
            else {
                var listener = () => {
                    resolve(this.Value);
                    this.removeListener("set", listener);
                };
                this.addListener("set", listener);
                this.UpdateValueBase();
            }
        });
    }
    Scope(callback) {
        return new scope_1.Scope(() => callback(this.Value));
    }
    Destroy() {
        super.Destroy();
    }
    UpdateValue(callback) {
        var value = null;
        var emitters = null;
        this.store.Action((reader, writer) => __awaiter(this, void 0, void 0, function* () {
            reader.Watching = true;
            value = yield this.GetFunction(reader, writer);
            reader.Watching = false;
            emitters = reader.Emitters;
        })).then(() => callback(emitters, value));
    }
}
exports.StoreQuery = StoreQuery;
//# sourceMappingURL=storeQuery.js.map