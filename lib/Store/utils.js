"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function IsValue(value) {
    if (!value)
        return true;
    return !(Array.isArray(value) || (typeof value === 'object' && {}.constructor === value.constructor));
}
exports.IsValue = IsValue;
//# sourceMappingURL=utils.js.map