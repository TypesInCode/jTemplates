"use strict";
var browser_1 = require("./DOM/browser");
var bindingTemplate_1 = require("./DOM/bindingTemplate");
var observable_1 = require("./Observable/observable");
var obj = observable_1.default.Create({
    Prop1: "test",
    Prop2: "blue",
    Class: "garbage-man",
    Arr: ["obs1", "obs2"]
});
var template = new bindingTemplate_1.BindingTemplate([
    { style: { type: "text/css" }, data: obj, children: function (d) {
            return { text: function () { return ("\n        .garbage-man: {\n            color: " + d.Prop2 + ";\n        }\n        "); } };
        }
    },
    { div: { className: function () { return obj.Class; }, style: { color: "red" } }, data: function () { return obj.Arr; }, on: { click: function () { return function (e) { return alert("click"); }; } }, children: function (c, i) {
            return { text: function () { return (c + " " + i + " obj.Prop1: " + obj.Prop1 + " --"); } };
        }
    }]);
var div = browser_1.default.window.document.createElement("div");
template.AttachTo(div);
console.log(div.innerHTML);
obj.Prop1 = "something different";
obj.Prop2 = "orange";
console.log(div.innerHTML);
obj.Class = "garbage-person";
console.log(div.innerHTML);
obj.Arr = ["sec3", "sec4", "sec5"];
console.log(div.innerHTML);
//# sourceMappingURL=index.js.map