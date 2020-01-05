import { Component } from "j-templates";
import { div } from "j-templates/DOM";
import { Inject } from "j-templates/Utils";

class IHello {
    Hello(): string { return ""; }
}

class Hello implements IHello {
    Hello() { return "Hello!" }
}

class Child extends Component {

    @Inject(IHello)
    greeting: IHello;

    public Template() {
        return div({ text: () => this.Injector.Get(IHello).Hello() });
    }

}

var child = Component.ToFunction("chi-ld", null, Child);

class Parent extends Component {

    @Inject(IHello)
    greeting = new Hello();

    public Template() {
        return child({});
    }

}

var parent = Component.ToFunction("par-ent", null, Parent);
Component.Attach(document.body, parent({}));