import { Template, BindingDefinition, CreateComponentFunction } from "./template";
import { ProxyObservable, Value } from "./ProxyObservable/proxyObservable";

export { Template, BindingDefinition, CreateComponentFunction, ProxyObservable, Value };

/* class Comp extends Template<any, any> {
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
    constructor(bindingDef: BindingDefinition<string, { title: any, body: any }>) {
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
            div({ props: () => ({ className: "header" }) }, this.Templates.title),
            div({ props: () => ({ className: "body" }) }, this.Templates.body)
        ];
    }
}

var childComp = CreateComponentFunction("childcomp", ChildComp);

var container = browser.window.document.getElementById("container");
var comp = new Comp();
comp.AttachTo(container);

comp.state.title = "something else"; */

