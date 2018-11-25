"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const template_1 = require("./template");
const objectStore_1 = require("./ObjectStore/objectStore");
const elements_1 = require("./DOM/elements");
var data = [];
for (var x = 0; x < 10000; x++) {
    data[x] = {
        _id: `root_${x}`,
        name: `item ${x}`,
        child: {
            _id: `child_${Math.ceil(Math.random() * 3)}`,
            name: `child item ${x}`
        }
    };
}
var count = 0;
var store = objectStore_1.ObjectStore.Create([], (val) => val._id);
setTimeout(() => {
    store.Write(store.Root, () => data);
}, 5000);
class Comp extends template_1.Template {
    constructor() {
        super("app");
        this.state = objectStore_1.ObjectStore.Create({ filter: "" });
    }
    get VisibleItems() {
        var s = new Date();
        var d = data.filter(i => {
            return i.child.name.toLowerCase().indexOf(this.state.Root.filter.toLowerCase()) >= 0;
        });
        var e = new Date();
        console.log(`Raw data processed in ${e.getTime() - s.getTime()} milliseconds`);
        var start = new Date();
        var ret = store.Root.filter(i => {
            return i.child.name.toLowerCase().indexOf(this.state.Root.filter.toLowerCase()) >= 0;
        });
        var end = new Date();
        console.log(`Data processed in ${end.getTime() - start.getTime()} milliseconds`);
        return ret;
    }
    Template() {
        return [
            elements_1.input({ props: () => ({ type: "button", value: "click" }), on: () => ({ click: this.onClick.bind(this) }) }),
            elements_1.input({ props: () => ({ type: "text", value: "" }), on: () => ({ keyup: this.onKeyUp.bind(this) }) }),
            elements_1.div({ key: i => i._id, data: () => this.VisibleItems }, (item) => [
                elements_1.div({ text: () => item.name }),
                elements_1.div({ data: () => item.child }, (child) => [
                    elements_1.div({ text: () => `Id: ${child._id} Name: ${child.name}` })
                ])
            ])
        ];
    }
    onClick() {
        store.Root[42].child.name = "test";
    }
    onKeyUp(e) {
        if (this.state.Root.filter === e.target.value)
            return;
        var start = new Date();
        this.state.Write(this.state.Root, (val) => { val.filter = e.target.value; });
        this.UpdateComplete(() => {
            var end = new Date();
            console.log(`Update complete in ${end.getTime() - start.getTime()} milliseconds`);
        });
    }
}
const browser_1 = require("./DOM/browser");
var container = browser_1.browser.window.document.getElementById("container");
var comp = new Comp();
var start = new Date();
comp.AttachTo(container);
var end = new Date();
console.log(`Attached in ${end.getTime() - start.getTime()} milliseconds`);
//# sourceMappingURL=index.js.map