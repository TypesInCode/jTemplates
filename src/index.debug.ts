import { Template, ComponentFunction, TemplateFunction, BindingDefinition, CreateComponentFunction } from "./template";
import { browser } from "./DOM/browser";
import { ProxyObservable } from "./ProxyObservable/proxyObservable";
// import { Component } from "./component";

/* var start = new Date();
browser.immediateAnimationFrames = true;

var obs = ProxyObservable.Create({ arr: [1, 2, 3], class: "test", text: "span content" });

var temp = new Template({
    type: "div",
    props: () => ({ className: obs.class }),
    data: () => obs.arr,
    children: (c: number, i: number) => [{
        defType: null,
        type: "span",
        text: () => `c: ${c} - i: ${i} - text: ${obs.text}`
    }]
});

var div = browser.window.document.createElement("div");
temp.AttachTo(div);

obs.arr.push(4);
obs.class = "test2";
console.log(div.innerHTML);
obs.text = "span changed";
obs.arr.splice(0, 2);
console.log(div.innerHTML);
var end = new Date();
console.log(end.getTime() - start.getTime()); */

class Comp extends Template<any, any> {
    state = ProxyObservable.Create({ arr: [1, 2, 3], class: "test", text: "span content", title: "subcomp TITLE" });

    constructor() {
        super(ComponentFunction("comp", Comp as { new(): Template<any, any> }, {}));
    }

    public Template(): Array<any> {
        return [
            childComp({ data: () => this.state.title }, {
                title: () => TemplateFunction("span", { text: () => this.state.title }),
                body: () => TemplateFunction("span", { text: () => this.state.text })
            })
        ];
    }
}

class ChildComp extends Template<string, { title: any, body: any }> {
    constructor(bindingDef: BindingDefinition<string, any>) {
        super(bindingDef);
    }

    protected get DefaultTemplates() {
        return {
            title: (): any => null,
            body: (): any => null
        }
    }

    protected Template(d: string) {
        return [
            TemplateFunction("div", { props: () => ({ className: "header" }) }, this.Templates.title),
            TemplateFunction("div", { props: () => ({ className: "body" }) }, this.Templates.body)
        ];
    }
}

var childComp = CreateComponentFunction("childcomp", ChildComp); // : BoundComponentFunction<string, { title: any, body: any }> = ComponentFunction.bind(null, "childcomp", ChildComp);

var div = browser.window.document.createElement("div");
var comp = new Comp();
comp.AttachTo(div);
console.log(div.innerHTML);

comp.state.text = "test2";
comp.state.title = "TITLE CHANGED";

console.log(div.innerHTML);