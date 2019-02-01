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
const storeAsync_1 = require("./Store/async/storeAsync");
var store = storeAsync_1.StoreAsync.Create({ temp: "test", temp2: "test2" });
var query = store.Query("", "", (reader) => __awaiter(this, void 0, void 0, function* () { return reader.Root.temp; }));
console.log(query.Value);
store.OnComplete.then(() => {
    console.log(query.Value);
});
//# sourceMappingURL=index.debug.js.map