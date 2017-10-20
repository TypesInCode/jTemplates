/// <reference path="../node_modules/@types/mocha/index.d.ts" />

import browser from "../src/DOM/browser";
import { BindingTemplate } from "../src/DOM/bindingTemplate";
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
});