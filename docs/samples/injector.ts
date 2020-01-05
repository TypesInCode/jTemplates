import { Component } from "j-templates";
import { div } from "j-templates/DOM";
import { ComponentNode } from "j-templates/Node/componentNode";
import { Injector } from "j-templates/Utils/injector";

class IHello {
    Hello(): string { return ""; }
}

class Hello implements IHello {
    Hello() { return "Hello!" }
}

class Child extends Component {

    public Template() {
        return div({ text: () => this.Injector.Get(IHello).Hello() });
    }

}

var child = Component.ToFunction("chi-ld", null, Child);

class Parent extends Component {

    constructor(data: void, templates: void, nodeRef: ComponentNode<void, void, void>, injector: Injector) {
        super(data, templates, nodeRef, injector);
        this.Injector.Set(IHello, new Hello);
    }

    public Template() {
        return child({});
    }

}

var parent = Component.ToFunction("par-ent", null, Parent);
Component.Attach(document.body, parent({}));