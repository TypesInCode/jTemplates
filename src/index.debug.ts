import { Template, BindingDefinition, CreateComponentFunction } from "./template";
import { browser } from "./DOM/browser";
import { ProxyObservable, Value } from "./ProxyObservable/proxyObservable";
import { span, div } from "./DOM/elements";

/* var obs = ProxyObservable.Create([]);
var val = null;
var emitters = ProxyObservable.Watch(() => val = obs.length);

console.log(val);
console.log(emitters.length);;

var setFired = false;
emitters[0].addListener("set", () => {
    setFired = true;
});

obs[0] = "test";
console.log(setFired);
console.log(obs[0]); */

class Comp extends Template<any, any> {
    state = ProxyObservable.Create({ arr: [1, 2, 3], class: "test", text: "span content", title: "subcomp TITLE" });

    constructor() {
        super("comp");
    }

    public Template(): Array<any> {
        return [
            childComp({ data: () => Value.Create(() => this.state.class) }, {
                title: () => span({ text: () => this.state.title }),
                // body: () => span({ text: () => this.state.text })
            })
        ];
    }

    public Destroy() {
        super.Destroy();
        ProxyObservable.Destroy(this.state);
    }
}

class ChildComp extends Template<Value<string>, { title: any, body?: any }> {
    protected Template(d: Value<string>) {
        return [
            div({ props: () => ({ className: `header ${d}` }) }, this.Templates.title),
            div({ props: () => ({ className: "body" }) }, this.Templates.body)
        ];
    }
}

var childComp = CreateComponentFunction("childcomp", ChildComp);

var container = browser.window.document.createElement("div");
var comp = new Comp();
comp.AttachTo(container);
console.log(container.innerHTML);

comp.state.text = "test2";
comp.state.title = "TITLE CHANGED";
comp.state.class = "class2";

console.log(container.innerHTML);
comp.Destroy();
console.log(container.innerHTML || "empty");