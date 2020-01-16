import { Component } from "j-templates";
import { span } from "j-templates/DOM";
import { ComponentNode } from "j-templates/Node/componentNode";
import { Injector } from "j-templates/Utils/injector";

class IGreeting {
    Greet(): string { return ""; }
}

class Hello implements IGreeting {
    Greet() { return "Hello!" }
}

class Child extends Component {

    get Greeting() {
        return this.Injector.Get(IGreeting);
    }

    public Template() {
        return span({}, () => this.Greeting.Greet());
    }

}

var child = Component.ToFunction("chi-ld", null, Child);

class Parent extends Component {

    get Greeting() {
        return this.Injector.Get(IGreeting);
    }

    set Greeting(val: IGreeting) {
        this.Injector.Set(IGreeting, val);
    }

    constructor(data: void, templates: void, nodeRef: ComponentNode<void, void, void>, injector: Injector) {
        super(data, templates, nodeRef, injector);
        this.Greeting = new Hello();
    }

    public Template() {
        return child({});
    }

}

var parent = Component.ToFunction("par-ent", null, Parent);
Component.Attach(document.body, parent({}));