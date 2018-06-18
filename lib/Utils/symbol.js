"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var supported = typeof Symbol != "undefined";
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