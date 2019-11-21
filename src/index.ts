import { StoreAsync } from "./Store/storeAsync";
import { StoreSync } from "./Store/storeSync";
import { AbstractStore } from "./Store/store/store";
import { NodeRef } from "./Node/nodeRef";
import { Component } from "./Node/component";
import { Store, Scope, Inject } from "./Utils/decorators";

export { Component, NodeRef, AbstractStore, StoreSync, StoreAsync, Store, Scope, Inject };

/* class Temp {
    public getVal() {
        return "temp function val";
    }
}

class ChildComp extends Component {

    @Inject(Temp)
    private temp: Temp;

    public Template() {
        return div({ text: () => this.temp.getVal() })
    }

}

var childComp = Component.ToFunction("child-comp", null, ChildComp);

class TestComp extends Component {

    @Store()
    private state = { test: "start" };

    @Store()
    private state2 = { temp: "end" };

    @Inject(Temp)
    private temp = new Temp();

    @Scope()
    get Test() {
        return `${this.state.test} ${this.state2.temp}`;
    }

    public Template() {
        return div({}, () => [
            div({ text: () => this.Test, on: { click: () => this.state = { test: "changed to this" } } }),
            childComp({})
        ]);
    }

}

var testComp = Component.ToFunction("test-comp", null, TestComp);
Component.Attach(document.getElementById("container"), testComp({})); */