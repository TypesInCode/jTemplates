/// <reference path="../node_modules/@types/mocha/index.d.ts" />

import browser from "../src/DOM/browser";
import { BindingTemplate } from "../src/DOM/bindingTemplate";
import { div, span, br } from "../src/DOM/elementMethods";
import { Observable } from "../src/Observable/observable";
import * as chai from "chai";
import Component from "../src/DOM/Component/component";
import { component, ComponentMethod } from "../src/DOM/elements";

browser.immediateAnimationFrames = true;
const expect = chai.expect;

class RootComponent extends Component<any> {

    public State = Observable.Create({ name: "Start Name" });

    public static get Name(): string {
        return "RootComponent";
    }

    public get Template() {
        return div({}, 
            childComponent({ text: this.State.name })
        )
    }

}

class ChildComponent extends Component<{ text: string }> {

    State = Observable.Create({ text: "" });
    
    public static get Name(): string {
        return "Child-Component";
    }

    public get Template() {
        return div({ text: () => this.State.text });
    }

    public SetParentData(data: { text: string }) {
        Observable.GetFrom(this.State.text).Join(data.text);
    }
}

var childComponent: ComponentMethod<{ text: string }> = component.bind(null, ChildComponent);

describe("Component", () => {
    it("initialized value", () => {
        var fragment = browser.createDocumentFragment();

        var root = new RootComponent();
        root.AttachTo(fragment);

        expect(fragment.childNodes.length).to.equal(1);
        var elem = fragment.childNodes[0] as HTMLElement;
        expect(elem).to.not.be.null;
        expect(elem.innerHTML).to.equal("<child-component><div>Start Name</div></child-component>");
        root.State.name = "second name";
        expect(elem.innerHTML).to.equal("<child-component><div>second name</div></child-component>");
    });
});