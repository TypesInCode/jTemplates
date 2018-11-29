"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var glbl = null;
if (typeof exports.window != "undefined")
    glbl = exports.window;
else {
    glbl = (new (require("jsdom").JSDOM)("")).window;
}
exports.window = glbl;
//# sourceMappingURL=window.js.map