import { Component } from "j-templates";
import { span } from "j-templates/DOM";
import { Inject } from "j-templates/Utils";

class IGreeting {
    Greet(): string { return ""; }
}

class Hello implements IGreeting {
    Greet() { return "Hello!" }
}

class Child extends Component {

    @Inject(IGreeting)
    Greeting: IGreeting;

    public Template() {
        return span({}, () => this.Greeting.Greet());
    }

}

var child = Component.ToFunction("chi-ld", null, Child);

class Parent extends Component {

    @Inject(IGreeting)
    Greeting = new Hello();

    public Template() {
        return child({});
    }

}

var parent = Component.ToFunction("par-ent", null, Parent);
Component.Attach(document.body, parent({}));