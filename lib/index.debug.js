"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const objectDiff_1 = require("./ObjectStore/objectDiff");
var resp = objectDiff_1.ObjectDiff("root", { id: "first", value: "second", other: { child: "value" } }, { id: "first", value: "second", other: { child: "value" } }, (val) => val.id);
console.log(resp);
//# sourceMappingURL=index.debug.js.map