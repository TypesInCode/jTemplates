"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var glbl = null;
if (typeof window != "undefined")
    glbl = window;
else {
    glbl = (new (require("jsdom").JSDOM)("")).window;
}
exports.wndw = glbl;
//# sourceMappingURL=window.js.map