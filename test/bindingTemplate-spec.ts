/// <reference path="../node_modules/@types/mocha/index.d.ts" />

import browser from "../src/DOM/browser";
import { BindingTemplate } from "../src/DOM/bindingTemplate";
import { div } from "../src/DOM/elementMethods";
import Observable from "../src/Observable/observable";
import * as chai from "chai";

const expect = chai.expect;

describe("BindingTemplate", () => {
    it("initialized value", () => {
        var template = new BindingTemplate({
            div: {}
        });

        var fragment = browser.createDocumentFragment();
        template.AttachTo(fragment);
        expect(fragment.childNodes.length).to.equal(1);
    });
    it("elements function", () => {
        var template = new BindingTemplate(
            div({})
        );

        var fragment = browser.createDocumentFragment();
        template.AttachTo(fragment);
        expect(fragment.childNodes.length).to.equal(1);
    });
    it("initialized value 2", () => {
        var template = new BindingTemplate([
            { div: {} },
            { div: {} }
        ]);

        var fragment = browser.createDocumentFragment();
        template.AttachTo(fragment);
        expect(fragment.childNodes.length).to.equal(2);
    });
    it("set element ID and text", () => {
        var template = new BindingTemplate({
            div: { id: "elemID" }, children: "element content"
        });

        var fragment = browser.createDocumentFragment();
        template.AttachTo(fragment);
        var elem = fragment.childNodes[0] as HTMLElement;
        expect(elem).to.not.be.null;
        expect(elem.id).to.equal("elemID");
        expect(elem.innerHTML).to.equal("element content");
    });
    it("set element method ID and text", () => {
        var template = new BindingTemplate(
            div({ id: "elemID" }, "element content")
        );

        var fragment = browser.createDocumentFragment();
        template.AttachTo(fragment);
        var elem = fragment.childNodes[0] as HTMLElement;
        expect(elem).to.not.be.null;
        expect(elem.id).to.equal("elemID");
        expect(elem.innerHTML).to.equal("element content");
    });
    it("Text Observable", () => {
        var obs = Observable.Create({
            Text: "this"
        });

        var template = new BindingTemplate({
            div: {}, children: obs.Text
        });

        var fragment = browser.createDocumentFragment();
        template.AttachTo(fragment);
        var elem = fragment.childNodes[0] as HTMLElement;
        expect(elem).to.not.be.null;
        expect(elem.innerHTML).to.equal("this");
    });
    it("Text binding 1", () => {
        var obs = Observable.Create({
            Text: "this"
        });

        var template = new BindingTemplate({
            div: {}, children: () => obs.Text
        });

        var fragment = browser.createDocumentFragment();
        template.AttachTo(fragment);
        var elem = fragment.childNodes[0] as HTMLElement;
        expect(elem).to.not.be.null;
        expect(elem.innerHTML).to.equal("this");
        obs.Text = "that";
        expect(elem.innerHTML).to.equal("that");
    });
});