/// <reference path="../node_modules/@types/mocha/index.d.ts" />

import browser from "../src/DOM/browser";
import { BindingTemplate } from "../src/DOM/bindingTemplate";
import { div, span, br } from "../src/DOM/elementMethods";
import { Observable } from "../src/Observable/observable";
import * as chai from "chai";
import Component from "../src/DOM/Component/component";
import { component, ComponentMethod, TemplateValueFunctionMap } from "../src/DOM/elements";

browser.immediateAnimationFrames = true;
const expect = chai.expect;

class RootComponent extends Component<any, any> {

    public State = Observable.Create({ name: "Start Name", header: "header name" });

    public static get Name(): string {
        return "RootComponent";
    }

    public get Template() {
        return div({}, 
            childComponent({ text: this.State.name }, {
                header: div({ text: () => this.State.header })
            })
        )
    }

}

interface IChildComponentData {
    text: string;
}

interface IChildComponentTemplates {
    header: any;
}

class ChildComponent extends Component<IChildComponentData, IChildComponentTemplates> {

    State = Observable.Create({ text: "" });
    
    public static get Name(): string {
        return "Child-Component";
    }

    public get DefaultTemplates(): TemplateValueFunctionMap<IChildComponentTemplates> {
        return {
            header: div({ text: "default header" })
        };
    }

    public get Template() {
        return [
            this.Templates.header(),
            div({ text: () => this.State.text })
        ];
    }

    public SetParentData(data: IChildComponentData) {
        Observable.GetFrom(this.State.text).Join(data.text);
    }
}

var childComponent: ComponentMethod<IChildComponentData, IChildComponentTemplates> = component.bind(null, ChildComponent);

describe("Component", () => {
    it("initialized value", () => {
        var fragment = browser.createDocumentFragment();

        var root = new RootComponent();
        root.AttachTo(fragment);

        expect(fragment.childNodes.length).to.equal(1);
        var elem = fragment.childNodes[0] as HTMLElement;
        expect(elem).to.not.be.null;
        expect(elem.innerHTML).to.equal("<child-component><div>header name</div><div>Start Name</div></child-component>");
        root.State.name = "second name";
        expect(elem.innerHTML).to.equal("<child-component><div>header name</div><div>second name</div></child-component>");
        root.State.header = "updated header";
        expect(elem.innerHTML).to.equal("<child-component><div>updated header</div><div>second name</div></child-component>");
    });
});