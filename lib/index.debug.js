"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const observable_1 = require("./Observable/observable");
const browser_1 = require("./DOM/browser");
const elementMethods_1 = require("./DOM/elementMethods");
const _1 = require(".");
const elements_1 = require("./DOM/elements");
class RootComponent extends _1.Component {
    constructor() {
        super(...arguments);
        this.State = observable_1.Observable.Create({ name: "Start Name" });
    }
    static get Name() {
        return "RootComponent";
    }
    get Template() {
        return elementMethods_1.div({}, childComponent({ text: this.State.name }));
    }
    ;
}
class ChildComponent extends _1.Component {
    constructor() {
        super(...arguments);
        this.State = observable_1.Observable.Create({ text: "" });
    }
    static get Name() {
        return "ChildComponent";
    }
    get Template() {
        return elementMethods_1.div({ text: () => this.State.text });
    }
    SetParentData(data) {
        observable_1.Observable.GetFrom(this.State.text).Join(data.text);
    }
}
var childComponent = elements_1.component.bind(null, ChildComponent);
var fragment = browser_1.default.createDocumentFragment();
var root = new RootComponent();
root.AttachTo(fragment);
var elem = fragment.childNodes[0];
console.log(elem.innerHTML);
root.State.name = "second name";
console.log(elem.innerHTML);
//# sourceMappingURL=index.debug.js.map