import Observable from "./Observable/observable";
import { BindingTemplate } from "./DOM/bindingTemplate";
import browser from "./DOM/browser";

var obs = Observable.Create({
    Text: "this"
});

var template = new BindingTemplate({
    div: { innerHTML: () => obs.Text }
});

var fragment = browser.createDocumentFragment();
template.AttachTo(fragment);
var elem = fragment.childNodes[0] as HTMLElement;
obs.Text = "that";
console.log(elem.innerHTML);