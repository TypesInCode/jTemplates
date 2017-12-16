"use strict";
var observable_1 = require("./Observable/observable");
var bindingTemplate_1 = require("./DOM/bindingTemplate");
var browser_1 = require("./DOM/browser");
var obs = observable_1.default.Create({
    Text: "this"
});
var template = new bindingTemplate_1.BindingTemplate({
    div: { innerHTML: function () { return obs.Text; } }
});
var fragment = browser_1.default.createDocumentFragment();
template.AttachTo(fragment);
var elem = fragment.childNodes[0];
obs.Text = "that";
console.log(elem.innerHTML);
//# sourceMappingURL=index_temp.js.map