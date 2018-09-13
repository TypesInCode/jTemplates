"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const template_1 = require("./template");
const browser_1 = require("./DOM/browser");
const proxyObservable_1 = require("./ProxyObservable/proxyObservable");
const elements_1 = require("./DOM/elements");
class Comp extends template_1.Template {
    constructor() {
        super("comp");
        this.state = proxyObservable_1.ProxyObservable.Create({ arr: [1, 2, 3], class: "test", text: "span content", title: "subcomp TITLE" });
    }
    Template() {
        return [
            childComp({ data: () => proxyObservable_1.Value.Create(() => this.state.class) }, {
                title: () => elements_1.span({ text: () => this.state.title }),
            })
        ];
    }
    Destroy() {
        super.Destroy();
        proxyObservable_1.ProxyObservable.Destroy(this.state);
    }
}
class ChildComp extends template_1.Template {
    Template(d) {
        return [
            elements_1.div({ props: () => ({ className: `header ${d}` }) }, this.Templates.title),
            elements_1.div({ props: () => ({ className: "body" }) }, this.Templates.body)
        ];
    }
}
var childComp = template_1.CreateComponentFunction("childcomp", ChildComp);
var container = browser_1.browser.window.document.createElement("div");
var comp = new Comp();
comp.AttachTo(container);
console.log(container.innerHTML);
comp.state.text = "test2";
comp.state.title = "TITLE CHANGED";
comp.state.class = "class2";
console.log(container.innerHTML);
comp.Destroy();
console.log(container.innerHTML || "empty");
//# sourceMappingURL=index.debug.js.map