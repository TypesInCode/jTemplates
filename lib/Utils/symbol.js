"use strict";
var supported = typeof Symbol != "undefined";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    get __supported() {
        return supported;
    },
    get iterator() {
        if (supported)
            return Symbol.iterator;
        return "Symbol.iterator";
    }
};
//# sourceMappingURL=symbol.js.map